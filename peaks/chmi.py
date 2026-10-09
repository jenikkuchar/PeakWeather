import requests
from datetime import datetime
from typing import Optional, Dict, Any

import config
from utils import utc_to_prague_local
from .constants import (
    CHMI_SOURCE_URL, CHMI_GRAPH_URL,
    FRENSTAT_WSI, FRENSTAT_GH_ID, FRENSTAT_PREVIEW_URL,
    RADEJOV_WSI, RADEJOV_GH_ID, RADEJOV_PREVIEW_URL,
    ZLIN_WSI, ZLIN_GH_ID, ZLIN_PREVIEW_URL,
)

# Sledované prvky ČHMÚ -> klíč ve výstupu
# T = teplota, H = vlhkost, SRA10M = srážky za 10 min, F = vítr, Fmax = nárazy,
# D = směr větru, SSV10M = sluneční svit za 10 min (ČHMÚ dává sekundy, ukládáme minuty)
ELEMENTS = {
    "T": "temperature",
    "H": "humidity",
    "SRA10M": "precipitation",
    "F": "wind",
    "Fmax": "wind_gust",
    "D": "wind_direction",
    "SSV10M": "sunshine",
}


def _to_float(value: Any) -> Optional[float]:
    try:
        return float(value) if value is not None and value != "" else None
    except (TypeError, ValueError):
        return None


def _set_values(result: Dict[str, Any], values: Dict[str, Any]) -> None:
    """Zapíše hodnoty prvků ČHMÚ do výsledku (sluneční svit převede ze sekund na minuty)."""
    for element, key in ELEMENTS.items():
        value = _to_float(values.get(element))
        if value is None:
            continue
        if element == "SSV10M":
            value = round(value / 60, 1)
        result[key] = value


def _set_time(result: Dict[str, Any], timestamp: str) -> None:
    """Čas měření v UTC ('2026-10-09T06:30:00Z') převede na lokální čas v ČR."""
    try:
        dt_utc = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
        result["time"] = utc_to_prague_local(dt_utc).strftime("%d.%m.%Y %H:%M")
    except ValueError:
        pass


def _latest_graph_point(graph: str, station: str) -> Optional[Dict[str, Any]]:
    """Poslední bod grafu z data-provider.chmi.cz, který obsahuje nějakou hodnotu."""
    url = CHMI_GRAPH_URL.format(graph=graph, station=station)
    response = requests.get(url, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)
    if response.status_code != 200:
        raise RuntimeError(f"CHMI data-provider returned status {response.status_code}")

    points = response.json().get("dataPoints", [])
    for point in reversed(points):
        values = point.get("values") or {}
        if any(_to_float(v) is not None for k, v in values.items() if k in ELEMENTS):
            return point
    return None


def _load_from_data_provider(result: Dict[str, Any], station: str) -> bool:
    """Data z grafů na chmi.cz (aktuálnější). Vrací True, pokud se podařilo načíst teplotu."""
    point = _latest_graph_point("klima-10m", station)
    if point is None or _to_float(point["values"].get("T")) is None:
        return False

    _set_time(result, point["timestamp"])
    _set_values(result, point["values"])

    # Nárazy větru jsou jen v grafu větru (ne každá stanice ho má)
    try:
        wind_point = _latest_graph_point("vitr-10m", station)
        if wind_point and wind_point["timestamp"] == point["timestamp"]:
            _set_values(result, {"Fmax": wind_point["values"].get("Fmax")})
    except Exception:
        pass

    return True


def _load_from_opendata(result: Dict[str, Any], wsi: str, now_utc: datetime) -> None:
    """Záložní zdroj: denní soubor 10minutových dat na opendata.chmi.cz (datum v UTC)."""
    url = CHMI_SOURCE_URL.format(wsi=wsi, date=now_utc.strftime("%Y%m%d"))
    response = requests.get(url, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)
    if response.status_code != 200:
        raise RuntimeError(f"CHMI API returned status {response.status_code}")

    payload: Dict[str, Any] = response.json()
    values = payload.get("data", {}).get("data", {}).get("values", [])

    latest: Dict[str, Dict[str, Any]] = {}
    for row in values:
        if len(row) < 6:
            continue
        station, element, dt_str, val, flag, quality = row
        if element not in ELEMENTS:
            continue
        # Ulož nejnovější záznam pro každý element
        prev = latest.get(element)
        if prev is None or dt_str > prev["dt"]:
            latest[element] = {"dt": dt_str, "val": val}

    # Čas - vezmeme nejnovější dostupný ze všech sledovaných elementů
    if latest:
        _set_time(result, max(info["dt"] for info in latest.values()))
    _set_values(result, {element: info["val"] for element, info in latest.items()})


def get_chmi_data(wsi: str, gh_id: str, peak: str, code: str, preview_url: str) -> Optional[dict]:
    """Get data from one CHMI station - primárně z data-provider.chmi.cz, záložně z opendata."""
    if not config.SOURCES.get(code, True):
        return None

    now_utc = datetime.utcnow()
    result: Dict[str, Any] = {
        "code": code,
        "peak": peak,
        "time": utc_to_prague_local(now_utc).strftime("%d.%m.%Y %H:%M"),
        "temperature": None,
        "preview_url": preview_url,
    }
    for key in ELEMENTS.values():
        result.setdefault(key, None)

    try:
        if _load_from_data_provider(result, gh_id):
            return result
    except Exception:
        pass

    try:
        _load_from_opendata(result, wsi, now_utc)
    except Exception:
        # Při chybě necháme hodnoty jako None, ale vrchol v JSONu ponecháme
        pass

    return result


def get_frenstat_data() -> Optional[dict]:
    return get_chmi_data(FRENSTAT_WSI, FRENSTAT_GH_ID, "Frenštát", "frenstat", FRENSTAT_PREVIEW_URL)


def get_radejov_data() -> Optional[dict]:
    return get_chmi_data(RADEJOV_WSI, RADEJOV_GH_ID, "Radějov", "radejov", RADEJOV_PREVIEW_URL)


def get_zlin_data() -> Optional[dict]:
    return get_chmi_data(ZLIN_WSI, ZLIN_GH_ID, "Zlín", "zlin", ZLIN_PREVIEW_URL)

import requests
from datetime import datetime
from typing import Optional, Dict, Any

import config
from utils import utc_to_prague_local
from .constants import (
    CHMI_SOURCE_URL,
    FRENSTAT_WSI, FRENSTAT_PREVIEW_URL,
    RADEJOV_WSI, RADEJOV_PREVIEW_URL,
    ZLIN_WSI, ZLIN_PREVIEW_URL,
)

# Sledované prvky ČHMÚ -> klíč ve výstupu
# T = teplota, H = vlhkost, SRA10M = srážky za 10 min, F = vítr, Fmax = nárazy,
# D = směr větru, SSV10M = sluneční svit za 10 min (minuty)
ELEMENTS = {
    "T": "temperature",
    "H": "humidity",
    "SRA10M": "precipitation",
    "F": "wind",
    "Fmax": "wind_gust",
    "D": "wind_direction",
    "SSV10M": "sunshine",
}


def get_chmi_data(wsi: str, peak: str, code: str, preview_url: str) -> Optional[dict]:
    """Get data from one CHMI station via open data API (10min data)."""
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
        # Soubor s dnešními daty (datum v UTC)
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
            newest_dt = max(info["dt"] for info in latest.values())
            try:
                # newest_dt je v UTC, převedeme na lokální čas v ČR (CET/CEST)
                dt_utc = datetime.strptime(newest_dt, "%Y-%m-%dT%H:%M:%SZ")
                result["time"] = utc_to_prague_local(dt_utc).strftime("%d.%m.%Y %H:%M")
            except ValueError:
                pass

        for element, key in ELEMENTS.items():
            if element in latest and latest[element]["val"] is not None:
                result[key] = float(latest[element]["val"])

    except Exception:
        # Při chybě necháme hodnoty jako None, ale vrchol v JSONu ponecháme
        pass

    return result


def get_frenstat_data() -> Optional[dict]:
    return get_chmi_data(FRENSTAT_WSI, "Frenštát", "frenstat", FRENSTAT_PREVIEW_URL)


def get_radejov_data() -> Optional[dict]:
    return get_chmi_data(RADEJOV_WSI, "Radějov", "radejov", RADEJOV_PREVIEW_URL)


def get_zlin_data() -> Optional[dict]:
    return get_chmi_data(ZLIN_WSI, "Zlín", "zlin", ZLIN_PREVIEW_URL)

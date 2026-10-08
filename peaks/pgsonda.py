import re
import requests
from datetime import datetime
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
from utils import extract_num, utc_to_prague_local
import config
from .constants import PGSONDA_TABLE_URL


def _header_key(th) -> Optional[str]:
    """Určí, co je ve sloupci tabulky, podle ikony nebo textu v hlavičce."""
    img = th.find('img')
    if img is not None:
        src = str(img.get('src', ''))
        for icon, key in (("icon_sample", "time"), ("icon_arrow", "wind_direction"),
                          ("icon_temp", "temperature"), ("icon_hum", "humidity")):
            if icon in src:
                return key
        return None
    text = th.get_text(strip=True)
    if text == "max":
        return "wind_gust"
    if text in ("ø", "ø", "&oslash"):
        return "wind"
    return None


def _parse_time(text: str, now: datetime) -> Optional[str]:
    """'Čt 8.10. 22:01' (místní čas, bez roku) -> '08.10.2026 22:01'."""
    match = re.search(r'(\d{1,2})\.(\d{1,2})\.\s*(\d{1,2}):(\d{2})', text)
    if not match:
        return None
    day, month, hour, minute = (int(g) for g in match.groups())
    dt = datetime(now.year, month, day, hour, minute)
    # Přelom roku - měření z prosince čtené v lednu
    if dt > now.replace(second=0, microsecond=0) and month > now.month:
        dt = dt.replace(year=now.year - 1)
    return dt.strftime("%d.%m.%Y %H:%M")


def _load_latest(slug: str, now: datetime) -> Dict[str, Any]:
    """Stáhne poslední řádek tabulky historie sondy (stejný zdroj jako tabulka na pgsonda.cz/<slug>/)."""
    response = requests.get(PGSONDA_TABLE_URL.format(slug), timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)
    if response.status_code != 200:
        raise RuntimeError(f"pgsonda.cz returned status {response.status_code}")

    soup = BeautifulSoup(response.content, 'html.parser')
    table = soup.find('table')
    if table is None:
        return {}

    rows = table.find_all('tr')
    if len(rows) < 2:
        return {}

    # Sloupce se u sond liší (např. Lopeník má navíc min. vítr), proto mapujeme podle hlavičky
    keys = [_header_key(th) for th in rows[0].find_all('th')]
    values = [td.get_text(strip=True) for td in rows[1].find_all('td')]

    data: Dict[str, Any] = {}
    for key, value in zip(keys, values):
        if key == "time":
            data["time"] = _parse_time(value, now)
        elif key:
            data[key] = extract_num(value)
    return data


def get_pgsonda_data(slug: str, peak: str, code: str) -> Optional[dict]:
    """Get latest data for one probe from pgsonda.cz."""
    if not config.SOURCES.get(code, True):
        return None

    now = utc_to_prague_local(datetime.utcnow())
    result = {
        "code": code,
        "peak": peak,
        "time": now.strftime("%d.%m.%Y %H:%M"),
        "temperature": None,
        "humidity": None,
        "wind": None,
        "wind_gust": None,
        "wind_direction": None,
        "preview_url": f"https://pgsonda.cz/{slug}/",
    }

    try:
        for key, value in _load_latest(slug, now).items():
            if value is not None:
                result[key] = value
    except Exception:
        # Při chybě necháme hodnoty jako None, ale vrchol v JSONu ponecháme
        pass

    return result


def get_ondrejnik_data() -> Optional[dict]:
    return get_pgsonda_data("ondrejnik", "Ondřejník", "ondrejnik")


def get_velky_lopenik_data() -> Optional[dict]:
    return get_pgsonda_data("velkylopenik", "Velký Lopeník", "velky_lopenik")


def get_cerna_hora_data() -> Optional[dict]:
    return get_pgsonda_data("cernabeskydy", "Černá hora", "cerna_hora")

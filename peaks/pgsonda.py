import requests
from datetime import datetime
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
from utils import extract_num
import config
from .constants import PGSONDA_OVERVIEW_URL
from .frenstat import _utc_to_prague_local

# Přehled všech sond se stahuje jen jednou za běh skriptu
_overview_cache: Optional[Dict[str, Dict[str, Any]]] = None


def _load_overview() -> Dict[str, Dict[str, Any]]:
    """Stáhne tabulku SEZNAM STANIC z pgsonda.cz a vrátí data podle slugu sondy (část URL)."""
    global _overview_cache
    if _overview_cache is not None:
        return _overview_cache

    response = requests.get(PGSONDA_OVERVIEW_URL, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)
    if response.status_code != 200:
        raise RuntimeError(f"pgsonda.cz returned status {response.status_code}")

    overview: Dict[str, Dict[str, Any]] = {}
    soup = BeautifulSoup(response.content, 'html.parser')
    for row in soup.find_all('tr'):
        columns = row.find_all('td')
        link = row.find('a')
        if len(columns) < 6 or link is None:
            continue

        # Sloupce: název | vítr průměr | vítr max | směr | teplota | vlhkost ("---" = neměří)
        slug = str(link.get('href', '')).rstrip('/').rsplit('/', 1)[-1]
        icon = row.find('img')
        overview[slug] = {
            "online": icon is not None and 'online' in str(icon.get('alt', '')).lower(),
            "temperature": extract_num(columns[4].text),
            "humidity": extract_num(columns[5].text),
            "wind": extract_num(columns[1].text),
            "wind_gust": extract_num(columns[2].text),
            "wind_direction": extract_num(columns[3].text),
        }

    _overview_cache = overview
    return overview


def get_pgsonda_data(slug: str, peak: str, code: str) -> Optional[dict]:
    """Get data for one probe from the pgsonda.cz overview table."""
    if not config.SOURCES.get(code, True):
        return None

    # Tabulka neobsahuje čas měření - použijeme aktuální čas v ČR
    result = {
        "code": code,
        "peak": peak,
        "time": _utc_to_prague_local(datetime.utcnow()).strftime("%d.%m.%Y %H:%M"),
        "temperature": None,
        "humidity": None,
        "wind": None,
        "wind_gust": None,
        "wind_direction": None,
        "preview_url": f"https://pgsonda.cz/{slug}/",
    }

    try:
        station = _load_overview().get(slug)
        # Sonda offline / v servisu ukazuje staré nebo nulové hodnoty - necháme null
        if station and station["online"]:
            for key in ("temperature", "humidity", "wind", "wind_gust", "wind_direction"):
                result[key] = station[key]
    except Exception:
        # Při chybě necháme hodnoty jako None, ale vrchol v JSONu ponecháme
        pass

    return result


def get_ondrejnik_data() -> Optional[dict]:
    return get_pgsonda_data("ondrejnik", "Ondřejník", "ondrejnik")


def get_velky_lopenik_data() -> Optional[dict]:
    return get_pgsonda_data("velkylopenik", "Velký Lopeník", "velky_lopenik")

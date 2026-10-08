import requests
from datetime import datetime
from typing import Optional
import config
from .constants import XCONTEST_SOURCE_URL


def get_xcontest_data(station_id: int, peak: str, code: str, preview_url: str) -> Optional[dict]:
    """Get wind data for one probe from XContest Wind API (wind.xcontest.app/<id>)."""
    if not config.SOURCES.get(code, True):
        return None

    # Sonda měří jen vítr - teplota zůstává null, při chybě zdroje i ostatní hodnoty
    result = {
        "code": code,
        "peak": peak,
        "time": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "temperature": None,
        "wind": None,
        "wind_gust": None,
        "wind_direction": None,
        "preview_url": preview_url,
    }

    try:
        url = XCONTEST_SOURCE_URL.format(station_id)
        response = requests.get(url, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)
        if response.status_code != 200:
            raise RuntimeError(f"XContest returned status {response.status_code}")

        values = response.json().get("values", [])
        if values:
            latest = values[-1]
            # Čas je v lokálním čase, např. "2026-10-08 21:50:54 CEST"
            time_str = latest.get("time")
            if time_str:
                try:
                    dt = datetime.strptime(time_str[:19], "%Y-%m-%d %H:%M:%S")
                    result["time"] = dt.strftime("%d.%m.%Y %H:%M")
                except ValueError:
                    pass
            result["wind"] = latest.get("windSpeedAvg")
            result["wind_gust"] = latest.get("windSpeed")
            result["wind_direction"] = latest.get("windDirection")
    except Exception:
        # Při chybě necháme hodnoty jako None, ale vrchol v JSONu ponecháme
        pass

    return result


def get_ondrejnik_data() -> Optional[dict]:
    return get_xcontest_data(2294, "Ondřejník", "ondrejnik", "https://pgsonda.cz/ondrejnik/")


def get_velky_lopenik_data() -> Optional[dict]:
    return get_xcontest_data(3136, "Velký Lopeník", "velky_lopenik", "https://www.pgsonda.cz/velkylopenik/")

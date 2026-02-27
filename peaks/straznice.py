import os
import sys
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# Ensure project root is on sys.path when running this file directly
if __package__ is None or __name__ == "__main__":
    current_dir = os.path.dirname(__file__)
    project_root = os.path.dirname(current_dir)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

from utils import normalize_text
import config
from .constants import STRAZNICE_SOURCE_URL, STRAZNICE_PREVIEW_URL


def _last_sunday_of_month(year: int, month: int) -> datetime:
    if month == 12:
        first_next_month = datetime(year + 1, 1, 1)
    else:
        first_next_month = datetime(year, month + 1, 1)
    last_day = first_next_month - timedelta(days=1)
    days_back = (last_day.weekday() + 1) % 7
    return last_day - timedelta(days=days_back)


def _utc_to_prague_local(utc_dt: datetime) -> datetime:
    year = utc_dt.year
    dst_start_date = _last_sunday_of_month(year, 3)
    dst_end_date = _last_sunday_of_month(year, 10)

    dst_start_utc = datetime(year, 3, dst_start_date.day, 1, 0, 0)
    dst_end_utc = datetime(year, 10, dst_end_date.day, 1, 0, 0)

    offset_hours = 2 if dst_start_utc <= utc_dt < dst_end_utc else 1
    return utc_dt + timedelta(hours=offset_hours)


def get_straznice_data() -> Optional[dict]:
    """Get data from CHMI Strážnice via open data API (10min data)."""
    if not config.SOURCES.get("straznice", True):
        return None

    peak = "Strážnice"
    code = normalize_text(peak)

    time_value: str = datetime.now().strftime("%d.%m.%Y %H:%M")
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    precipitation: Optional[float] = None
    wind: Optional[float] = None

    preview_url = STRAZNICE_PREVIEW_URL

    try:
        today_str = datetime.now().strftime("%Y%m%d")
        url = STRAZNICE_SOURCE_URL.format(today_str)
        preview_url = STRAZNICE_PREVIEW_URL

        response = requests.get(url, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)
        if response.status_code != 200:
            raise RuntimeError(f"CHMI API returned status {response.status_code}")

        payload: Dict[str, Any] = response.json()
        values = payload.get("data", {}).get("data", {}).get("values", [])

        target_elements = {"F", "H", "SRA10M", "T"}
        latest: Dict[str, Dict[str, Any]] = {}

        for row in values:
            if len(row) < 6:
                continue
            station, element, dt_str, val, flag, quality = row
            if element not in target_elements:
                continue
            prev = latest.get(element)
            if prev is None or dt_str > prev["dt"]:
                latest[element] = {"dt": dt_str, "val": val}

        if latest:
            newest_dt = max(info["dt"] for info in latest.values())
            try:
                dt_utc = datetime.strptime(newest_dt, "%Y-%m-%dT%H:%M:%SZ")
                dt_local = _utc_to_prague_local(dt_utc)
                time_value = dt_local.strftime("%d.%m.%Y %H:%M")
            except ValueError:
                pass

        temperature = float(latest["T"]["val"]) if "T" in latest and latest["T"]["val"] is not None else None
        humidity = float(latest["H"]["val"]) if "H" in latest and latest["H"]["val"] is not None else None
        precipitation = (
            float(latest["SRA10M"]["val"]) if "SRA10M" in latest and latest["SRA10M"]["val"] is not None else None
        )
        wind = float(latest["F"]["val"]) if "F" in latest and latest["F"]["val"] is not None else None

    except Exception:
        pass

    result = {
        "code": code,
        "peak": peak,
        "time": time_value,
        "temperature": temperature,
        "preview_url": preview_url,
    }

    if humidity is not None:
        result["humidity"] = humidity
    if precipitation is not None:
        result["precipitation"] = precipitation
    if wind is not None:
        result["wind"] = wind

    return result


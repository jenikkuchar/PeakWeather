import re
import unicodedata
from datetime import datetime, timedelta

def extract_num(text):
    """Extract a number from text"""
    if not text or not isinstance(text, str):
        return None

    # Replace comma with dot for decimal numbers
    text = text.replace(',', '.')

    match = re.search(r'(-?\d+[.]?\d*)', text.strip())
    if match:
        return float(match.group(1))
    return None

def normalize_text(text):
    """Create a code from text by removing diacritics and special characters"""
    # Convert text to lowercase
    text = text.lower()
    # Remove diacritics
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    # Replace spaces and special characters with underscores
    text = re.sub(r'[^a-z0-9]', '_', text)
    # Remove multiple underscores
    text = re.sub(r'_+', '_', text)
    # Remove underscores at the beginning and end
    text = text.strip('_')
    return text

def _last_sunday_of_month(year: int, month: int) -> datetime:
    # Find last day of month then step back to Sunday (weekday: Mon=0..Sun=6)
    if month == 12:
        first_next_month = datetime(year + 1, 1, 1)
    else:
        first_next_month = datetime(year, month + 1, 1)
    last_day = first_next_month - timedelta(days=1)
    days_back = (last_day.weekday() + 1) % 7
    return last_day - timedelta(days=days_back)


def utc_to_prague_local(utc_dt: datetime) -> datetime:
    """
    Convert UTC datetime to Europe/Prague local time without external tz database.
    EU DST rules:
    - DST starts: last Sunday in March at 01:00 UTC (offset becomes +2)
    - DST ends:   last Sunday in October at 01:00 UTC (offset becomes +1)
    """
    year = utc_dt.year
    dst_start_date = _last_sunday_of_month(year, 3)   # date of last Sunday in March
    dst_end_date = _last_sunday_of_month(year, 10)    # date of last Sunday in October

    dst_start_utc = datetime(year, 3, dst_start_date.day, 1, 0, 0)  # 01:00 UTC
    dst_end_utc = datetime(year, 10, dst_end_date.day, 1, 0, 0)     # 01:00 UTC

    offset_hours = 2 if dst_start_utc <= utc_dt < dst_end_utc else 1
    return utc_dt + timedelta(hours=offset_hours)


def prague_now_str():
    """Aktuální čas v ČR jako 'DD.MM.YYYY HH:MM' (nezávisle na časové zóně serveru)"""
    return utc_to_prague_local(datetime.utcnow()).strftime("%d.%m.%Y %H:%M")

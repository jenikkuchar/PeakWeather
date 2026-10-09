import math
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


def sun_elevation(utc_dt, lat=49.5, lon=18.2):
    """Výška Slunce nad obzorem ve stupních (zjednodušený výpočet NOAA), výchozí poloha Beskydy"""
    day = utc_dt.timetuple().tm_yday
    g = 2 * math.pi / 365 * (day - 1 + (utc_dt.hour - 12) / 24)
    decl = (0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g)
            - 0.006758 * math.cos(2 * g) + 0.000907 * math.sin(2 * g)
            - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g))
    eq_time = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g)
                        - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    solar_minutes = utc_dt.hour * 60 + utc_dt.minute + eq_time + 4 * lon
    hour_angle = math.radians(solar_minutes / 4 - 180)
    lat_rad = math.radians(lat)
    cos_zenith = (math.sin(lat_rad) * math.sin(decl)
                  + math.cos(lat_rad) * math.cos(decl) * math.cos(hour_angle))
    return 90 - math.degrees(math.acos(max(-1.0, min(1.0, cos_zenith))))


# Číselník stavu počasí (atribut "condition"), popis v README.md
CONDITIONS = (
    "clear", "mostly_clear", "partly_cloudy", "mostly_cloudy", "cloudy",
    "mist", "fog",
    "drizzle", "light_rain", "rain", "heavy_rain", "showers",
    "sleet", "light_snow", "snow", "heavy_snow",
    "storm",
)

# Intenzita srážek (mm/h): do 0,5 mrholení, do 2,5 slabý, do 8 mírný, nad 8 silný
DRIZZLE_MM_H = 0.5
LIGHT_MM_H = 2.5
HEAVY_MM_H = 8.0


def _precipitation_condition(intensity, text, temperature):
    """Druh a intenzita srážek z popisu a/nebo naměřeného úhrnu (mm/h)."""
    snowy = re.search(r"sníh|sněž", text)
    mixed = re.search(r"se sněhem|sněhem s deštěm|déšť a sníh", text)
    cold = temperature is not None and temperature <= 0.5

    if mixed:
        return "sleet"
    if snowy or (cold and not re.search(r"déšť|dešť|mrhol", text)):
        if re.search(r"slab|neměřiteln", text) or (intensity is not None and intensity < LIGHT_MM_H):
            return "light_snow"
        if re.search(r"siln|vydatn|hust", text) or (intensity is not None and intensity >= HEAVY_MM_H):
            return "heavy_snow"
        return "snow"
    if re.search(r"přeháň", text):
        return "showers"
    if re.search(r"mrhol|neměřiteln", text):
        return "drizzle"
    if re.search(r"siln|vydatn|přívalov", text):
        return "heavy_rain"
    if re.search(r"slab", text):
        return "light_rain"
    if intensity is not None:
        if intensity < DRIZZLE_MM_H:
            return "drizzle"
        if intensity < LIGHT_MM_H:
            return "light_rain"
        if intensity >= HEAVY_MM_H:
            return "heavy_rain"
    return "rain"


def weather_condition(peak, precipitation_minutes=60):
    """
    Odhadne stav počasí z dostupných údajů vrcholu (popis, srážky, oblačnost, vlhkost).
    precipitation_minutes = za jak dlouhý interval zdroj udává srážky (ČHMÚ 10 min).
    Vrací hodnotu z CONDITIONS, nebo None, když o počasí nic nevíme.
    """
    text = (peak.get("details") or "").lower()
    temperature = peak.get("temperature")
    precipitation = peak.get("precipitation")
    cloud_cover = peak.get("cloud_cover")
    humidity = peak.get("humidity")

    if re.search(r"bouř", text):
        return "storm"

    intensity = None
    if precipitation is not None and precipitation > 0:
        intensity = precipitation * 60 / precipitation_minutes
    if intensity is not None or re.search(r"déšť|dešť|mrhol|přeháň|srážk|sníh|sněž", text):
        return _precipitation_condition(intensity, text, temperature)

    if re.search(r"mlh|kouřmo|opar", text) or cloud_cover == 9:
        # Slabá mlha / opar (dohlednost nad 500 m) vs. mlha
        return "mist" if re.search(r"slab|opar|kouřmo", text) else "fog"

    # Oblačnost v osminách (Horská služba, u ČHMÚ odhad ze slunečního svitu)
    if cloud_cover is not None:
        if cloud_cover <= 1:
            return "clear"
        if cloud_cover <= 3:
            return "mostly_clear"
        if cloud_cover <= 5:
            return "partly_cloudy"
        if cloud_cover <= 7:
            return "mostly_cloudy"
        return "cloudy"

    if re.search(r"skoro jasno", text):
        return "mostly_clear"
    if re.search(r"polojasno", text):
        return "partly_cloudy"
    if re.search(r"oblačno", text):
        return "mostly_cloudy"
    if re.search(r"jasno", text):
        return "clear"
    if re.search(r"zataž", text):
        return "cloudy"

    # Vrchol v oblaku
    if humidity is not None and humidity >= 99:
        return "fog"

    return None


# Síla větru (atribut "wind_level"), přibližně podle Beaufortovy stupnice
WIND_LEVELS = ("calm", "breeze", "windy", "strong", "storm")

# (úroveň, průměrný vítr od m/s, nárazy od m/s) - od nejsilnější
_WIND_THRESHOLDS = (
    ("storm", 20.0, 25.0),
    ("strong", 14.0, 17.0),
    ("windy", 8.0, 12.0),
    ("breeze", 3.0, 6.0),
)


def wind_level(peak):
    """Síla větru z průměrného větru a nárazů. Vrací hodnotu z WIND_LEVELS, nebo None bez dat."""
    wind = peak.get("wind")
    gust = peak.get("wind_gust")
    if wind is None and gust is None:
        return None
    for level, wind_from, gust_from in _WIND_THRESHOLDS:
        if (wind is not None and wind >= wind_from) or (gust is not None and gust >= gust_from):
            return level
    return "calm"

import re
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
from utils import extract_num, normalize_text, prague_now_str
import config
from .constants import PUSTEVNY_SOURCE_URL, PUSTEVNY_PREVIEW_URL, PUSTEVNY_HS_URL

# Slovní směr větru (Horská služba) -> stupně
WIND_DIRECTIONS = {
    "severní": 0, "severovýchodní": 45, "východní": 90, "jihovýchodní": 135,
    "jižní": 180, "jihozápadní": 225, "západní": 270, "severozápadní": 315,
}


def _get_horska_sluzba_data() -> Optional[Dict[str, Any]]:
    """Záložní zdroj: stránka aktuálního počasí Horské služby pro Pustevny."""
    response = requests.get(PUSTEVNY_HS_URL, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)
    if response.status_code != 200:
        raise RuntimeError(f"Horská služba returned status {response.status_code}")

    soup = BeautifulSoup(response.content, 'html.parser')

    # Dvojice "Teplota:" -> "5 °C", "Vítr:" -> "Severní 5 m/s, nárazy 10 m/s", ...
    params: Dict[str, str] = {}
    for row in soup.select('table.forecastTable tr'):
        th, td = row.find('th'), row.find('td')
        if th and td:
            params[th.get_text(strip=True).rstrip(':').lower()] = td.get_text(" ", strip=True)

    temperature = extract_num(params.get("teplota"))
    if temperature is None:
        return None

    data: Dict[str, Any] = {"temperature": temperature}

    # Čas měření teploty a větru: "Aktuální počasí 09. 10. 2026, 10:56 hod"
    for h2 in soup.find_all('h2'):
        m = re.search(r'(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}),\s*(\d{1,2}):(\d{2})', h2.get_text())
        if m and "aktuální počasí" in h2.get_text().lower():
            day, month, year, hour, minute = (int(g) for g in m.groups())
            data["time"] = datetime(year, month, day, hour, minute).strftime("%d.%m.%Y %H:%M")
            break

    wind_text = params.get("vítr", "")
    if wind_text:
        if "bezvětří" in wind_text.lower():
            data["wind"] = 0.0
        else:
            speeds = re.findall(r'(\d+(?:[.,]\d+)?)\s*m/s', wind_text)
            if speeds:
                data["wind"] = float(speeds[0].replace(',', '.'))
            if len(speeds) > 1:
                data["wind_gust"] = float(speeds[1].replace(',', '.'))
            first_word = wind_text.split()[0].lower()
            if first_word in WIND_DIRECTIONS:
                data["wind_direction"] = float(WIND_DIRECTIONS[first_word])

    # Celková oblačnost v osminách ("8/8 zataženo"; 9/8 = oblohu nelze rozeznat)
    cloud = re.match(r'\s*(\d)/8', params.get("oblačnost suma", ""))
    if cloud:
        data["cloud_cover"] = int(cloud.group(1))

    # Popis pro widget: dohlednost (mlha) a srážky
    details = []
    visibility = params.get("dohlednost")
    if visibility and re.search(r'mlh|kouřmo|opar', visibility.lower()):
        details.append(visibility)
    rain = params.get("srážky")
    if rain:
        details.append(rain)
    if details:
        data["details"] = ", ".join(details)

    return data


def get_pustevny_data():
    """Get data from Pustevny - using XML source"""
    if not config.SOURCES["pustevny"]:
        return None

    # Name and code of the peak
    peak = "Pustevny"
    code = normalize_text(peak)

    # Default values - při chybě zdroje zůstanou null, ale vrchol v JSONu ponecháme
    temperature = None
    humidity = None
    time = prague_now_str()

    try:
        url = PUSTEVNY_SOURCE_URL
        response = requests.get(url, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)

        if response.status_code != 200:
            raise RuntimeError(f"Pustevny returned status {response.status_code}")

        # Parsing XML
        root = ET.fromstring(response.content)

        # Setting namespace for XML
        namespace = {'th2e': 'http://www.papouch.com/xml/th2e/act'}

        # Find sensor with id=1 for temperature
        temp_sensor = root.find(".//th2e:sns[@id='1']", namespace)
        if temp_sensor is not None:
            temp_val = temp_sensor.get('val')
            if temp_val is not None:
                temperature = float(temp_val)

        # Find sensor with id=2 for humidity
        humid_sensor = root.find(".//th2e:sns[@id='2']", namespace)
        if humid_sensor is not None:
            humid_val = humid_sensor.get('val')
            if humid_val is not None:
                humidity = float(humid_val)

        # Find time data
        status_elem = root.find(".//th2e:status", namespace)
        if status_elem is not None and 'time' in status_elem.attrib:
            time_str = status_elem.get('time')
            if time_str is not None:
                # Converting time format from MM/DD/YYYY HH:MM:SS to DD.MM.YYYY HH:MM
                try:
                    dt = datetime.strptime(time_str, "%m/%d/%Y %H:%M:%S")
                    time = dt.strftime("%d.%m.%Y %H:%M")
                except ValueError:
                    pass
    except Exception:
        pass

    result = {
        "code": code,
        "peak": peak,
        "time": time,
        "temperature": temperature,
        "humidity": humidity,
        "preview_url": PUSTEVNY_PREVIEW_URL,
    }

    # Hlavní zdroj nevrátil teplotu -> data z Horské služby
    if temperature is None:
        try:
            fallback = _get_horska_sluzba_data()
            if fallback:
                result.update(fallback)
                result["preview_url"] = PUSTEVNY_HS_URL
        except Exception:
            pass

    return result

import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from utils import normalize_text
import config

def get_pustevny_data():
    """Get data from Pustevny - using XML source"""
    if not config.SOURCES["pustevny"]:
        return None
        
    try:
        url = "https://www.pustevny.cz/temp/pustevny.xml"
        response = requests.get(url, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)

        if response.status_code != 200:
            return None

        # Parsing XML
        root = ET.fromstring(response.content)

        # Setting namespace for XML
        namespace = {'th2e': 'http://www.papouch.com/xml/th2e/act'}

        # Finding sensor data in XML
        temperature = None
        humidity = None
        time = None

        # Find sensor with id=1 for temperature
        temp_sensor = root.find(".//th2e:sns[@id='1']", namespace)
        if temp_sensor is not None:
            temperature = float(temp_sensor.get('val'))

        # Find sensor with id=2 for humidity
        humid_sensor = root.find(".//th2e:sns[@id='2']", namespace)
        if humid_sensor is not None:
            humidity = float(humid_sensor.get('val'))

        # Find time data
        status_elem = root.find(".//th2e:status", namespace)
        if status_elem is not None and 'time' in status_elem.attrib:
            time_str = status_elem.get('time')
            # Converting time format from MM/DD/YYYY HH:MM:SS to DD.MM.YYYY HH:MM
            try:
                dt = datetime.strptime(time_str, "%m/%d/%Y %H:%M:%S")
                time = dt.strftime("%d.%m.%Y %H:%M")
            except ValueError:
                time = datetime.now().strftime("%d.%m.%Y %H:%M")
        else:
            time = datetime.now().strftime("%d.%m.%Y %H:%M")

        # Name and code of the peak
        peak = "Pustevny"
        code = normalize_text(peak)

        return {
            "code": code,
            "peak": peak,
            "time": time,
            "temperature": temperature,
            "humidity": humidity
        }
    except Exception:
        return None

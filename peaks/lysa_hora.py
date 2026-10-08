import os
import sys
import requests  # pyright: ignore[reportMissingModuleSource]
import re
from datetime import datetime
from bs4 import BeautifulSoup  # pyright: ignore[reportMissingModuleSource]

# Ensure project root is on sys.path when running this file directly
if __package__ is None or __name__ == "__main__":
    current_dir = os.path.dirname(__file__)
    project_root = os.path.dirname(current_dir)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

from utils import extract_num, normalize_text
import config
from .constants import LYSA_HORA_SOURCE_URL, LYSA_HORA_PREVIEW_URL

def get_lysa_hora_data():
    """Get data from Lysá hora"""
    if not config.SOURCES["lysa_hora"]:
        return None

    # Name and code of the peak
    peak = "Lysá hora"
    code = normalize_text(peak)

    # Default values - při chybě zdroje zůstanou null, ale vrchol v JSONu ponecháme
    result = {
        "code": code,
        "peak": peak,
        "time": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "temperature": None,
        "humidity": None,
        "wind": None,
        "wind_gust": None,
        "details": None,
        "preview_url": LYSA_HORA_PREVIEW_URL,
    }

    try:
        url = LYSA_HORA_SOURCE_URL
        response = requests.get(url, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)

        if response.status_code != 200:
            return result

        soup = BeautifulSoup(response.content, 'html.parser')
        table = soup.find('table', class_='tabTyp3')

        if not table:
            return result

        rows = table.find_all('tr')[1:]
        data_row = None

        for row in reversed(rows):
            columns = row.find_all('td')
            # Upravená podmínka: alespoň 2 sloupce musí být vyplněné
            if len(columns) >= 9 and sum(1 for col in columns[:9] if col.text.strip()) >= 2:
                data_row = columns
                break

        if not data_row:
            return result

        # Processing date and time
        date_time_text = data_row[0].text.strip()
        date_time_parts = re.search(r'(\d{2}\.\d{2}\.\d{4}).*?(\d{2}:\d{2}:\d{2})', date_time_text)

        if date_time_parts:
            date_part = date_time_parts.group(1)
            time_part = date_time_parts.group(2)[:5]
            result["time"] = f"{date_part} {time_part}"
        else:
            result["time"] = date_time_text

        result["temperature"] = extract_num(data_row[1].text)
        result["humidity"] = extract_num(data_row[2].text)
        result["wind"] = extract_num(data_row[4].text)
        result["wind_gust"] = extract_num(data_row[5].text)
        result["details"] = data_row[8].text.strip()
    except Exception:
        pass

    return result

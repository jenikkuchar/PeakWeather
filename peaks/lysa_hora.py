import requests
import re
from bs4 import BeautifulSoup
from utils import extract_num, normalize_text
import config

def get_lysa_hora_data():
    """Get data from Lysá hora"""
    if not config.SOURCES["lysa_hora"]:
        return None
        
    try:
        url = "https://www.lysahora.cz/pocasi.phtml"
        response = requests.get(url, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)

        if response.status_code != 200:
            return None

        soup = BeautifulSoup(response.content, 'html.parser')
        table = soup.find('table', class_='tabTyp3')

        if not table:
            return None

        rows = table.find_all('tr')[1:]
        data_row = None

        for row in reversed(rows):
            columns = row.find_all('td')
            # Upravená podmínka: alespoň 2 sloupce musí být vyplněné
            if len(columns) >= 9 and sum(1 for col in columns[:9] if col.text.strip()) >= 2:
                data_row = columns
                break

        if not data_row:
            return None

        # Processing date and time
        date_time_text = data_row[0].text.strip()
        date_time_parts = re.search(r'(\d{2}\.\d{2}\.\d{4}).*?(\d{2}:\d{2}:\d{2})', date_time_text)

        if date_time_parts:
            date_part = date_time_parts.group(1)
            time_part = date_time_parts.group(2)[:5]
            time = f"{date_part} {time_part}"
        else:
            time = date_time_text

        # Name and code of the peak
        peak = "Lysá hora"
        code = normalize_text(peak)

        return {
            "code": code,
            "peak": peak,
            "time": time,
            "temperature": extract_num(data_row[1].text),
            "humidity": extract_num(data_row[2].text),
            "wind": extract_num(data_row[4].text),
            "wind_gust": extract_num(data_row[5].text),
            "details": data_row[8].text.strip()
        }
    except Exception:
        return None

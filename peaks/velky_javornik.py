import requests
import re
from bs4 import BeautifulSoup
from datetime import datetime
from utils import extract_num, normalize_text
import config

def get_velky_javornik_data():
    """Get data from Velký Javorník"""
    if not config.SOURCES["velky_javornik"]:
        return None
        
    try:
        # Name and code of the peak
        peak = "Velký Javorník"
        code = normalize_text(peak)

        # Default result values
        result = {
            "code": code,
            "peak": peak,
            "time": None,
            "temperature": None,
            "precipitation": None
        }

        # 1. Attempt to get data via API
        if config.SOURCES["velky_javornik_api"]:
            try:
                api_url = f"https://pgsonda.cz/api/api_json_user.php?name=velkyjavornik&api_key={config.API_KEY}"
                api_response = requests.get(api_url, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)

                if api_response.status_code == 200:
                    # Try to process JSON response
                    api_data = api_response.json()

                    # Check if API returned successful data
                    if api_data.get("status") == "success" and "data" in api_data and len(api_data["data"]) > 0:
                        first_record = api_data["data"][0]

                        # Extracting data from API
                        if "db_date" in first_record and "db_time" in first_record:
                            date_str = first_record["db_date"]
                            time_str = first_record["db_time"]

                            # Converting date format from YYYY-MM-DD to DD.MM.YYYY
                            try:
                                dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
                                result["time"] = dt.strftime("%d.%m.%Y %H:%M")
                            except ValueError:
                                # In case of format error, keep as is
                                result["time"] = f"{date_str} {time_str}"

                        # Extracting values
                        if "db_temp" in first_record:
                            result["temperature"] = float(first_record["db_temp"])

                        if "db_hum" in first_record:
                            result["humidity"] = float(first_record["db_hum"])

                        if "db_avgspd" in first_record:
                            result["wind"] = float(first_record["db_avgspd"])

                        if "db_maxspd" in first_record:
                            result["wind_gust"] = float(first_record["db_maxspd"])

                        if "db_rain_hour" in first_record:
                            result["precipitation"] = float(first_record["db_rain_hour"])
            except Exception:
                pass

        # 2. Getting data from pod.cz
        url2 = "https://www.pod.cz/portal/Srazky/cz/smartphone/Mereni.aspx?id=300280087&oid=1"

        try:
            response2 = requests.get(url2, timeout=config.DEFAULT_TIMEOUT, headers=config.HEADERS)

            if response2.status_code == 200:
                # Getting the whole HTML for analysis
                html_content = response2.text

                # Finding values directly using regular expressions - fixed to support negative values
                time_match = re.search(r'<td class="bunkaGridu">(\d{2}\.\d{2}\.\d{4} \d{2}:\d{2})</td>', html_content)
                time_pod = time_match.group(1) if time_match else None

                precipitation_match = re.search(r'id="ctl00_ObsahCPH_dataMereni24hGV_ctl\d+_srazkaLbl">(-?\d+,\d+)</span>', html_content)
                precipitation_pod = extract_num(precipitation_match.group(1)) if precipitation_match else None

                temperature_match = re.search(r'id="ctl00_ObsahCPH_dataMereni24hGV_ctl\d+_teplotaLbl">(-?\d+,\d+)</span>', html_content)
                temperature_pod = extract_num(temperature_match.group(1)) if temperature_match else None

                # Using data from the backup source
                if not result["time"] and time_pod:
                    result["time"] = time_pod

                if not result["temperature"] and temperature_pod is not None:
                    result["temperature"] = temperature_pod

                if not result["precipitation"] and precipitation_pod is not None:
                    result["precipitation"] = precipitation_pod

                # If we still don't have data, try BeautifulSoup for more flexible extraction
                if not result["temperature"] or not result["precipitation"]:
                    soup = BeautifulSoup(html_content, 'html.parser')

                    # Find spans with temperature and precipitation
                    temp_spans = soup.find_all('span', id=lambda x: x and 'teplotaLbl' in x)
                    precip_spans = soup.find_all('span', id=lambda x: x and 'srazkaLbl' in x)

                    if temp_spans and not result["temperature"]:
                        result["temperature"] = extract_num(temp_spans[0].text)

                    if precip_spans and not result["precipitation"]:
                        result["precipitation"] = extract_num(precip_spans[0].text)
        except Exception:
            pass

        # When we don't have time, use current
        if not result["time"]:
            result["time"] = datetime.now().strftime("%d.%m.%Y %H:%M")

        # Check if we have at least temperature
        if result["temperature"] is not None:
            # Remove None values for cleaner JSON
            result_clean = {k: v for k, v in result.items() if v is not None}
            return result_clean

        return None

    except Exception:
        return None

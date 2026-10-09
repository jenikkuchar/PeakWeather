import json
import os
from datetime import datetime
import config
from utils import weather_condition
from peaks import get_lysa_hora_data, get_pustevny_data, get_velky_javornik_data
from peaks import get_frenstat_data, get_radejov_data, get_zlin_data
from peaks import get_ondrejnik_data, get_velky_lopenik_data, get_cerna_hora_data

def ensure_output_dir():
    """Zajistí existenci adresáře pro výstupní JSON soubory"""
    if not os.path.exists(config.OUTPUT_DIR):
        os.makedirs(config.OUTPUT_DIR)

def write_json_output(data, filename="peakweather.json"):
    """Zapíše data do JSON souboru"""
    ensure_output_dir()
    
    # Zajistí, že cesta obsahuje adresář
    filepath = os.path.join(config.OUTPUT_DIR, filename)
    
    # Zápis do souboru s českými znaky
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Data uložena do: {filepath}")
    return filepath

# Jednotný formát výstupu - každý vrchol má všechny atributy v tomto pořadí,
# co zdroj neměří, je null (popis atributů v README.md)
FIELDS = [
    "code",
    "peak",
    "time",
    "temperature",
    "humidity",
    "precipitation",
    "wind",
    "wind_gust",
    "wind_direction",
    "sunshine",
    "cloud_cover",
    "condition",
    "details",
    "preview_url",
]

def normalize_peak(peak):
    """Doplní chybějící atributy jako null, prázdné texty převede na null, doplní stav počasí"""
    result = {field: (peak.get(field) if peak.get(field) != "" else None) for field in FIELDS}
    if result["temperature"] is not None:
        # ČHMÚ udává srážky za 10 minut, ostatní zdroje za hodinu
        result["condition"] = weather_condition(result, peak.get("precipitation_minutes", 60))
    return result

def main():
    # Pořadí vrcholů ve výstupu
    sources = [
        get_frenstat_data,
        get_radejov_data,
        get_zlin_data,
        get_velky_javornik_data,
        get_lysa_hora_data,
        get_pustevny_data,
        get_cerna_hora_data,
        get_ondrejnik_data,
        get_velky_lopenik_data,
    ]

    # Získání dat ze všech zdrojů (vypnuté zdroje vrací None)
    data = [normalize_peak(peak) for peak in (get_data() for get_data in sources) if peak]

    # Vrcholy bez dat (bez teploty) přesuneme na konec, jinak pořadí zůstává
    data.sort(key=lambda peak: peak.get("temperature") is None)

    # Zápis dat do JSON souboru
    if data:
        write_json_output(data)
    else:
        print("Nepodařilo se získat žádná data.")

if __name__ == "__main__":
    main()

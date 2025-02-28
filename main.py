import json
import os
from datetime import datetime
import config
from peaks import get_lysa_hora_data, get_pustevny_data, get_velky_javornik_data

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

def main():
    data = []

    # Získání dat ze všech zdrojů
    lysa_hora = get_lysa_hora_data()
    if lysa_hora:
        data.append(lysa_hora)

    pustevny = get_pustevny_data()
    if pustevny:
        data.append(pustevny)

    velky_javornik = get_velky_javornik_data()
    if velky_javornik:
        data.append(velky_javornik)

    # Zápis dat do JSON souboru
    if data:
        write_json_output(data)
    else:
        print("Nepodařilo se získat žádná data.")

if __name__ == "__main__":
    main()

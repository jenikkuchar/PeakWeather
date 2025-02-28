# PeakWeather

Skript pro shromažďování dat o počasí z vrcholů Beskyd (Lysá hora, Pustevny, Velký Javorník).

## Instalace

1. Naklonujte repozitář:
```
git clone https://github.com/jenikkuchar/PeakWeather.git
cd PeakWeather
```

2. Nainstalujte závislosti:
```
pip install -r requirements.txt
```

3. Vytvořte adresář pro data (volitelné, program ho vytvoří automaticky):
```
mkdir data
```

## Konfigurace

Upravte soubor `config.py` podle vašich potřeb:

- `API_KEY`: Nastavte svůj API klíč pro pgsonda.cz (pokud máte)
- `OUTPUT_DIR`: Adresář pro ukládání JSON souborů
- `SOURCES`: Zapnutí/vypnutí jednotlivých zdrojů dat

## Použití

Spusťte hlavní skript:
```
python main.py
```

Skript stáhne data z nakonfigurovaných zdrojů a uloží je do JSON souboru v adresáři `data/`.

## Struktura projektu

- `config.py`: Konfigurační soubor
- `main.py`: Hlavní spouštěcí skript
- `utils.py`: Pomocné funkce
- `data/`: Adresář pro výstupní JSON soubory
- `peaks/`: Moduly pro jednotlivé vrcholy
  - `lysa_hora.py`: Modul pro Lysou horu
  - `pustevny.py`: Modul pro Pustevny
  - `velky_javornik.py`: Modul pro Velký Javorník

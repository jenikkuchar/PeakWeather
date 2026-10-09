# PeakWeather

Skript pro shromažďování dat o počasí z vrcholů Beskyd (Lysá hora, Pustevny, Velký Javorník).

![GitHub Actions Status](https://github.com/jenikkuchar/PeakWeather/workflows/Generate%20Weather%20Data/badge.svg)

## Funkce

- Automatické shromažďování dat o počasí z různých zdrojů
- Zpracování a uložení dat ve formátu JSON
- Automatické spouštění pomocí GitHub Actions každých 15 minut
- Konfigurovatelné zdroje dat

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

### Lokální spuštění

Spusťte hlavní skript:
```
python main.py
```

Skript stáhne data z nakonfigurovaných zdrojů a uloží je do JSON souboru v adresáři `data/`.

### Automatické spouštění (GitHub Actions)

Repozitář je nakonfigurován s GitHub Actions, které automaticky spouštějí skript každých 15 minut a ukládají výsledky do adresáře `data/`. 

Můžete také spustit workflow manuálně přes záložku "Actions" na GitHub.

## Formát dat

`data/peakweather.json` je seznam vrcholů. Každý vrchol má vždy všechny atributy;
co daný zdroj neměří nebo se nepodařilo načíst, je `null`.

| Atribut | Popis |
|---|---|
| `code` | Kód vrcholu (např. `frenstat`) |
| `peak` | Název vrcholu |
| `time` | Čas měření v českém čase, `DD.MM.YYYY HH:MM` |
| `temperature` | Teplota (°C) |
| `humidity` | Relativní vlhkost (%) |
| `precipitation` | Srážky (mm) za poslední interval zdroje |
| `wind` | Průměrná rychlost větru (m/s) |
| `wind_gust` | Nárazy větru (m/s) |
| `wind_direction` | Směr, odkud vítr fouká (°, 0 = sever) |
| `sunshine` | Sluneční svit za posledních 10 min (minuty, 0–10) |
| `cloud_cover` | Celková oblačnost v osminách (0–8, 9 = oblohu nelze rozeznat) |
| `details` | Slovní popis počasí (mlha, srážky, …) |
| `preview_url` | Odkaz na zdrojovou stránku |

Vrcholy bez teploty jsou na konci seznamu.

## Struktura projektu

- `config.py`: Konfigurační soubor
- `main.py`: Hlavní spouštěcí skript
- `utils.py`: Pomocné funkce
- `data/`: Adresář pro výstupní JSON soubory
- `peaks/`: Moduly pro jednotlivé vrcholy
  - `lysa_hora.py`: Modul pro Lysou horu
  - `pustevny.py`: Modul pro Pustevny
  - `velky_javornik.py`: Modul pro Velký Javorník
- `.github/workflows/`: Konfigurační soubory pro GitHub Actions

## Přispívání

Příspěvky jsou vítány! Pokud chcete přispět:

1. Forkněte repozitář
2. Vytvořte větev pro vaši funkci (`git checkout -b feature/amazing-feature`)
3. Proveďte změny a commitněte je (`git commit -m 'Add some amazing feature'`)
4. Pushněte do větve (`git push origin feature/amazing-feature`)
5. Otevřete Pull Request

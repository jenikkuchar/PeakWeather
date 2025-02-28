# Konfigurační soubor pro Beskydy Weather

# Nastavení HTTP požadavků
DEFAULT_TIMEOUT = 5
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# API klíč pro pgsonda.cz
API_KEY = "test_key"  # Nahraďte skutečným API klíčem

# Cesta pro ukládání JSON souborů
OUTPUT_DIR = "data"

# Aktivace/deaktivace jednotlivých zdrojů dat
SOURCES = {
    "lysa_hora": True,
    "pustevny": True,
    "velky_javornik": True,
    "velky_javornik_api": False  # Zdroj pro API pgsonda.cz
}

LYSA_HORA_SOURCE_URL = "https://www.lysahora.cz/pocasi.phtml"
LYSA_HORA_PREVIEW_URL = "https://www.lysahora.cz/pocasi.phtml"

PUSTEVNY_SOURCE_URL = "https://www.pustevny.cz/temp/pustevny.xml"
PUSTEVNY_PREVIEW_URL = "https://pustevny.cz/pocasi/"

VELKY_JAVORNIK_API_SOURCE_URL = "https://pgsonda.cz/api/api_json_user.php?name=velkyjavornik"
VELKY_JAVORNIK_PREVIEW_URL = "https://www.pod.cz/portal/Srazky/cz/smartphone/Mereni.aspx?id=300280087&oid=1&fbclid=IwAR3c3Y3EBUDnVefCKkFU4rPv0CVcyR65ArHBsZZnnSwF6EbSevK5-FiMfWk"

# CHMI 10minutová data, {wsi} = WSI stanice (meta1-YYYYMMDD.json), {date} ve formátu YYYYMMDD
CHMI_SOURCE_URL = "https://opendata.chmi.cz/meteorology/climate/now/data/10m-{wsi}-{date}.json"

# CHMI Frenštát pod Radhoštěm (O1FREN01)
FRENSTAT_WSI = "0-203-0-11785"
FRENSTAT_PREVIEW_URL = "https://www.chmi.cz/w/o1fren01-frenstat-pod-radhostem?zalozka=klima&c=49.5411%2C18.2406%2C11&l=kraje%2Cteplota%2CZTM"

# pgsonda.cz - poslední řádek tabulky historie sondy, {} = název sondy z URL (např. ondrejnik)
PGSONDA_TABLE_URL = "https://pgsonda.cz/meteoweb/get_table.php?limit=1&name={}"

# CHMI Radějov (B7RADE01), od 16. 9. 2026 nástupce stanice Strážnice
RADEJOV_WSI = "0-203-0-41302058001"
RADEJOV_PREVIEW_URL = "https://www.chmi.cz/w/b7rade01-radejov"

# CHMI Zlín (B1ZLIN01)
ZLIN_WSI = "0-203-0-11775"
ZLIN_PREVIEW_URL = "https://www.chmi.cz/w/b1zlin01-zlin"

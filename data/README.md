# Data o počasí z Beskyd

Tento adresář obsahuje automaticky generované JSON soubory s daty o počasí z vrcholů Beskyd.

Soubory jsou generovány GitHub Actions a aktualizovány každých 5 minut.

## Struktura dat

Každý JSON soubor obsahuje pole objektů s následující strukturou:

```json
[
  {
    "code": "lysa_hora",
    "peak": "Lysá hora",
    "time": "01.01.2023 12:00",
    "temperature": 5.2,
    "humidity": 65.0,
    "wind": 10.5,
    "wind_gust": 15.2,
    "details": "Polojasno"
  },
  {
    "code": "pustevny",
    "peak": "Pustevny",
    "time": "01.01.2023 12:05",
    "temperature": 4.8,
    "humidity": 68.0
  },
  {
    "code": "velky_javornik",
    "peak": "Velký Javorník",
    "time": "01.01.2023 12:10",
    "temperature": 6.2,
    "precipitation": 0.0
  }
]
```

Poznámka: Struktura dat se může lišit podle dostupnosti údajů ze zdrojů.

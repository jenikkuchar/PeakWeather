# Inicializační soubor pro balíček peaks
from peaks.lysa_hora import get_lysa_hora_data
from peaks.pustevny import get_pustevny_data
from peaks.velky_javornik import get_velky_javornik_data
from peaks.frenstat import get_frenstat_data
from peaks.radejov import get_radejov_data

__all__ = ['get_lysa_hora_data', 'get_pustevny_data', 'get_velky_javornik_data', 'get_frenstat_data', 'get_radejov_data']

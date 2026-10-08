# Inicializační soubor pro balíček peaks
from peaks.lysa_hora import get_lysa_hora_data
from peaks.pustevny import get_pustevny_data
from peaks.velky_javornik import get_velky_javornik_data
from peaks.chmi import get_frenstat_data, get_radejov_data, get_zlin_data
from peaks.pgsonda import get_ondrejnik_data, get_velky_lopenik_data, get_cerna_hora_data

__all__ = ['get_lysa_hora_data', 'get_pustevny_data', 'get_velky_javornik_data', 'get_frenstat_data', 'get_radejov_data', 'get_zlin_data',
           'get_ondrejnik_data', 'get_velky_lopenik_data', 'get_cerna_hora_data']

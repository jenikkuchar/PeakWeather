// PeakWeather – widget pro Übersicht (https://tracesof.net/uebersicht/)
// Zobrazuje aktuální počasí z vrcholů Beskyd a okolí z data/peakweather.json.
// Instalace: zkopíruj soubor do složky widgetů Übersichtu (menu → Open Widgets Folder).

import { run } from "uebersicht";

const DATA_URL =
  "https://raw.githubusercontent.com/jenikkuchar/PeakWeather/main/data/peakweather.json";

// Data starší než tolik minut se označí jako neaktuální
const STALE_MINUTES = 90;

// Poloha pro výpočet dne/noci (Beskydy)
const LAT = 49.5;
const LON = 18.2;

// Parametr t obchází cache GitHubu (jinak se data mění až po ~5 minutách)
export const command = `curl -sf --max-time 15 "${DATA_URL}?t=$(date +%s)"`;

// 5 minut – workflow data aktualizuje každých 15 minut
export const refreshFrequency = 5 * 60 * 1000;

export const className = `
  top: 20px;
  left: 20px;
  width: 372px;
  box-sizing: border-box;
  padding: 8px;
  color: #e6e8ee;
  font-family: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
  font-size: 12px;
  background: linear-gradient(160deg, rgba(30, 34, 44, 0.78), rgba(14, 16, 22, 0.78));
  -webkit-backdrop-filter: blur(28px) saturate(170%);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 22px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);

  .peak {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px 10px 10px;
    border-radius: 16px;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  .peak + .peak {
    margin-top: 2px;
  }
  .peak:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  .peak.offline {
    opacity: 0.55;
  }

  .icon {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 13px;
    background: rgba(255, 255, 255, 0.05);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }
  .icon svg {
    width: 28px;
    height: 28px;
    overflow: visible;
  }

  .info {
    flex: 1;
    min-width: 0;
  }
  .name {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 13.5px;
    font-weight: 600;
    color: #f4f6fa;
    white-space: nowrap;
  }
  .name .text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .time {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10.5px;
    font-weight: 500;
    color: #7c8394;
    font-variant-numeric: tabular-nums;
  }
  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 6px rgba(74, 222, 128, 0.7);
  }
  .dot.stale {
    background: #f59e0b;
    box-shadow: 0 0 6px rgba(245, 158, 11, 0.7);
  }
  .dot.offline {
    background: #6b7280;
    box-shadow: none;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 5px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    color: #c3c8d4;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .chip .muted {
    color: #7c8394;
  }
  .chip svg {
    width: 11px;
    height: 11px;
  }
  .chip.windy {
    background: rgba(245, 158, 11, 0.16);
    color: #fcd34d;
  }
  .chip.storm {
    background: rgba(239, 68, 68, 0.18);
    color: #fca5a5;
  }
  .details {
    margin-top: 4px;
    font-size: 11px;
    color: #8a90a0;
  }

  .temp {
    flex: none;
    min-width: 66px;
    text-align: right;
    font-size: 30px;
    font-weight: 200;
    line-height: 1;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }
  .temp .unit {
    font-size: 15px;
    font-weight: 300;
    vertical-align: top;
    margin-left: 1px;
    opacity: 0.6;
  }
  .temp.missing {
    font-size: 22px;
    color: #4b5160;
  }

  .error {
    padding: 12px;
    color: #fca5a5;
  }
`;

// ---------- pomocné funkce ----------

// "08.10.2026 21:50" -> Date
const parseTime = (text) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/.exec(text || "");
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]) : null;
};

const isNum = (v) => typeof v === "number" && !Number.isNaN(v);

const fmt = (v, digits = 1) =>
  v.toLocaleString("cs-CZ", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Barva teploty od mrazu po vedro
const tempColor = (t) => {
  if (t <= -10) return "#a5b4fc";
  if (t <= 0) return "#7dd3fc";
  if (t <= 10) return "#a7f3d0";
  if (t <= 20) return "#fde68a";
  if (t <= 28) return "#fdba74";
  return "#fca5a5";
};

const formatTime = (date, now) => {
  if (!date) return "";
  const hm = date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  return date.toDateString() === now.toDateString()
    ? hm
    : `${date.getDate()}. ${date.getMonth() + 1}. ${hm}`;
};

// Výška Slunce nad obzorem ve stupních (zjednodušený výpočet NOAA)
const sunElevation = (date) => {
  const rad = Math.PI / 180;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (date.getTime() - start) / 86400000;
  const g = (2 * Math.PI / 365) * (day - 1);
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const eqTime =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const solarMinutes = utcMinutes + eqTime + 4 * LON;
  const hourAngle = (solarMinutes / 4 - 180) * rad;
  const cosZenith =
    Math.sin(LAT * rad) * Math.sin(decl) + Math.cos(LAT * rad) * Math.cos(decl) * Math.cos(hourAngle);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZenith))) / rad;
};

// Odhad počasí z dostupných dat. Vrací typ ikony.
const getCondition = (peak, date) => {
  const text = (peak.details || "").toLowerCase();
  const night = sunElevation(date || new Date()) < -0.8;
  const cold = isNum(peak.temperature) && peak.temperature <= 0.5;

  if (/bouř/.test(text)) return "storm";
  if (/sníh|sněž/.test(text)) return "snow";
  if ((isNum(peak.precipitation) && peak.precipitation > 0) || /déšť|dešť|mrhol|přeháň|srážk/.test(text)) {
    return cold ? "snow" : "rain";
  }
  if (/mlh|kouřmo/.test(text)) return "fog";

  // Sluneční svit za posledních 10 minut (stanice ČHMÚ)
  if (isNum(peak.sunshine)) {
    if (night) return "night";
    if (peak.sunshine >= 7) return "sun";
    if (peak.sunshine >= 2) return "partly";
    return "cloud";
  }

  if (/jasno/.test(text)) return night ? "night" : "sun";
  if (/polojasno|oblač/.test(text)) return night ? "partlyNight" : "partly";
  if (/zataž/.test(text)) return "cloud";

  // Vrchol v oblaku
  if (isNum(peak.humidity) && peak.humidity >= 99) return "fog";

  return "generic";
};

const openUrl = (url) => {
  if (url) run(`open "${url}"`);
};

// ---------- ikony ----------

const SUN = "#fbbf24";
const MOON = "#c7d2fe";
const CLOUD = "#cbd5e1";
const CLOUD_DARK = "#94a3b8";
const RAIN = "#60a5fa";
const SNOW = "#e0f2fe";
const BOLT = "#facc15";

const CloudShape = ({ fill = CLOUD, x = 0, y = 0, s = 1 }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M8 23h15a5.5 5.5 0 0 0 .6-10.97A7.5 7.5 0 0 0 9.3 13.6 4.75 4.75 0 0 0 8 23z"
    fill={fill}
  />
);

const SunShape = ({ cx = 16, cy = 16, r = 5.5, rays = true }) => (
  <g>
    {rays &&
      [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line
          key={a}
          x1={cx}
          y1={cy - r - 3}
          x2={cx}
          y2={cy - r - 5.5}
          stroke={SUN}
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${a} ${cx} ${cy})`}
        />
      ))}
    <circle cx={cx} cy={cy} r={r} fill={SUN} />
  </g>
);

const MoonShape = ({ x = 0, y = 0, s = 1 }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M20.5 4.5a11 11 0 1 0 7 17.4A9 9 0 0 1 20.5 4.5z"
    fill={MOON}
  />
);

const Drops = ({ color = RAIN }) => (
  <g stroke={color} strokeWidth="2" strokeLinecap="round">
    <line x1="11" y1="26" x2="9.5" y2="29.5" />
    <line x1="16.5" y1="26" x2="15" y2="29.5" />
    <line x1="22" y1="26" x2="20.5" y2="29.5" />
  </g>
);

const Flakes = () => (
  <g fill={SNOW}>
    <circle cx="10" cy="28" r="1.6" />
    <circle cx="16" cy="29.5" r="1.6" />
    <circle cx="22" cy="28" r="1.6" />
  </g>
);

const icons = {
  sun: () => <SunShape r={6} />,
  night: () => <MoonShape x={1} y={1} s={0.95} />,
  partly: () => (
    <g>
      <SunShape cx={12} cy={11} r={4.5} />
      <CloudShape x={4} y={6} s={0.9} />
    </g>
  ),
  partlyNight: () => (
    <g>
      <MoonShape x={-2} y={-2} s={0.7} />
      <CloudShape x={4} y={6} s={0.9} />
    </g>
  ),
  cloud: () => (
    <g>
      <CloudShape fill={CLOUD_DARK} x={6} y={-2} s={0.75} />
      <CloudShape x={0} y={4} />
    </g>
  ),
  rain: () => (
    <g>
      <CloudShape x={0} y={-2} />
      <Drops />
    </g>
  ),
  snow: () => (
    <g>
      <CloudShape x={0} y={-2} />
      <Flakes />
    </g>
  ),
  storm: () => (
    <g>
      <CloudShape fill={CLOUD_DARK} x={0} y={-3} />
      <path d="M17 19l-4 6h3.5l-2 6 6-8h-3.5l2-4z" fill={BOLT} />
    </g>
  ),
  fog: () => (
    <g>
      <CloudShape fill={CLOUD_DARK} x={0} y={-4} />
      <g stroke={CLOUD} strokeWidth="2" strokeLinecap="round">
        <line x1="5" y1="23" x2="27" y2="23" />
        <line x1="8" y1="27.5" x2="24" y2="27.5" />
      </g>
    </g>
  ),
  // Obecná ikona, když o oblačnosti nic nevíme
  generic: () => (
    <g>
      <path d="M2 27L12 11l5 7 3-4 10 13z" fill="#64748b" />
      <path d="M12 11l3.2 4.5-2 1.5-1.2-2-1.5 2-1.7-1.2z" fill="#e2e8f0" />
    </g>
  ),
};

const WeatherIcon = ({ type }) => (
  <svg viewBox="0 0 32 32">{(icons[type] || icons.generic)()}</svg>
);

// Šipka ukazuje, kam vítr fouká (směr v datech je odkud fouká)
const WindArrow = ({ direction }) => (
  <svg viewBox="0 0 12 12" style={{ transform: `rotate(${direction + 180}deg)` }}>
    <path d="M6 1l3.5 8L6 7.2 2.5 9z" fill="#7dd3fc" />
  </svg>
);

// ---------- komponenty ----------

const Wind = ({ peak }) => {
  const max = Math.max(isNum(peak.wind) ? peak.wind : 0, isNum(peak.wind_gust) ? peak.wind_gust : 0);
  const level = max >= 15 ? "storm" : max >= 10 ? "windy" : "";

  if (!isNum(peak.wind) && !isNum(peak.wind_gust)) return null;

  return (
    <span className={`chip ${level}`}>
      {isNum(peak.wind_direction) && <WindArrow direction={peak.wind_direction} />}
      {isNum(peak.wind) ? fmt(peak.wind) : "–"}
      {isNum(peak.wind_gust) && <span className="muted">/ {fmt(peak.wind_gust)}</span>}
      <span className="muted">m/s</span>
    </span>
  );
};

const Peak = ({ peak, now }) => {
  const date = parseTime(peak.time);
  const hasTemp = isNum(peak.temperature);
  const ageMinutes = date ? (now - date) / 60000 : Infinity;
  const status = !hasTemp ? "offline" : ageMinutes > STALE_MINUTES ? "stale" : "";
  const condition = hasTemp ? getCondition(peak, date) : "generic";

  return (
    <div className={`peak ${status === "offline" ? "offline" : ""}`} onClick={() => openUrl(peak.preview_url)}>
      <div className="icon">
        <WeatherIcon type={condition} />
      </div>

      <div className="info">
        <div className="name">
          <span className="text">{peak.peak}</span>
          <span className="time">
            <span className={`dot ${status}`} />
            {hasTemp ? formatTime(date, now) : "bez dat"}
          </span>
        </div>

        <div className="stats">
          <Wind peak={peak} />
          {isNum(peak.humidity) && (
            <span className="chip">
              {fmt(peak.humidity, 0)}
              <span className="muted">%</span>
            </span>
          )}
          {isNum(peak.precipitation) && peak.precipitation > 0 && (
            <span className="chip">
              {fmt(peak.precipitation)}
              <span className="muted">mm</span>
            </span>
          )}
        </div>

        {peak.details && <div className="details">{peak.details}</div>}
      </div>

      {hasTemp ? (
        <div className="temp" style={{ color: tempColor(peak.temperature) }}>
          {fmt(peak.temperature)}
          <span className="unit">°</span>
        </div>
      ) : (
        <div className="temp missing">–</div>
      )}
    </div>
  );
};

export const render = ({ output, error }) => {
  let peaks = null;
  try {
    peaks = JSON.parse(output);
  } catch (e) {
    peaks = null;
  }

  const now = new Date();

  if (!Array.isArray(peaks)) {
    return <div className="error">Data se nepodařilo načíst{error ? `: ${error}` : ""}</div>;
  }

  return (
    <div>
      {peaks.map((peak) => (
        <Peak key={peak.code} peak={peak} now={now} />
      ))}
    </div>
  );
};

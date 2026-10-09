// PeakWeather – widget pro Übersicht (https://tracesof.net/uebersicht/)
// Zobrazuje aktuální počasí z vrcholů Beskyd a okolí z data/peakweather.json.
// Instalace: zkopíruj soubor do složky widgetů Übersichtu (menu → Open Widgets Folder).

import { run, React } from "uebersicht";

const DATA_URL =
  "https://raw.githubusercontent.com/jenikkuchar/PeakWeather/main/data/peakweather.json";

// Data starší než tolik minut se označí jako neaktuální (oranžová tečka)
const STALE_MINUTES = 60;

// Poloha pro výpočet dne/noci (Beskydy)
const LAT = 49.5;
const LON = 18.2;

// Čas posledního commitu s daty = čas aktualizace (GitHub API, bez přihlášení 60 dotazů/h)
const COMMITS_URL =
  "https://api.github.com/repos/jenikkuchar/PeakWeather/commits?path=data/peakweather.json&per_page=1";

// Oddělovač mezi daty a odpovědí GitHub API ve výstupu příkazu
const SEPARATOR = "@@PEAKWEATHER@@";

// Stáří aktualizace v patičce: zelená do 30 min, oranžová do 60 min, pak červená
const FOOTER_OK_MINUTES = 30;
const FOOTER_STALE_MINUTES = 60;

// Parametr t obchází cache GitHubu (jinak se data mění až po ~5 minutách)
export const command = `curl -sf --max-time 15 "${DATA_URL}?t=$(date +%s)"; echo "${SEPARATOR}"; curl -sf --max-time 15 "${COMMITS_URL}"`;

// 15 minut – stejně často workflow aktualizuje data
export const refreshFrequency = 15 * 60 * 1000;

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
  .chip .bars {
    display: inline-flex;
    align-items: flex-end;
    gap: 2px;
    height: 12px;
    margin-right: 3px;
  }
  .chip .bar {
    width: 4px;
    border-radius: 1.5px;
    background: rgba(255, 255, 255, 0.12);
  }
  .chip.windy {
    background: rgba(245, 158, 11, 0.16);
    color: #fcd34d;
  }
  .chip.storm {
    background: rgba(239, 68, 68, 0.18);
    color: #fca5a5;
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

  .footer {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 6px 10px 2px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 10.5px;
    color: #7c8394;
    font-variant-numeric: tabular-nums;
  }
  .footer .next {
    margin-right: auto;
  }
  .footer .dot.old {
    background: #ef4444;
    box-shadow: 0 0 6px rgba(239, 68, 68, 0.7);
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

// Ikona podle stavu počasí z dat (číselník "condition"), v noci varianta s měsícem
const getIcon = (peak, date) => {
  const night = sunElevation(date || new Date()) < -0.8;
  // Stavy, které mají noční variantu s měsícem
  const nightVariants = {
    clear: "night",
    mostly_clear: "mostlyClearNight",
    partly_cloudy: "partlyNight",
    showers: "showersNight",
  };
  const dayIcons = {
    clear: "sun",
    mostly_clear: "mostlyClear",
    partly_cloudy: "partly",
    mostly_cloudy: "mostlyCloudy",
    cloudy: "cloud",
    mist: "mist",
    fog: "fog",
    drizzle: "drizzle",
    light_rain: "lightRain",
    rain: "rain",
    heavy_rain: "heavyRain",
    showers: "showers",
    sleet: "sleet",
    light_snow: "lightSnow",
    snow: "snow",
    heavy_snow: "heavySnow",
    storm: "storm",
  };
  if (night && nightVariants[peak.condition]) return nightVariants[peak.condition];
  return dayIcons[peak.condition] || "generic";
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

// Kapky deště: počet 1-5, short = mrholení (krátké tečky)
const DROP_X = { 1: [16], 2: [12.5, 19.5], 3: [10, 16, 22], 4: [8.5, 13.5, 18.5, 23.5], 5: [7, 11.5, 16, 20.5, 25] };
const Drops = ({ count = 3, short = false, color = RAIN }) => (
  <g stroke={color} strokeWidth={short ? 2.2 : 2} strokeLinecap="round">
    {DROP_X[count].map((x, i) => (
      <line key={i} x1={x + 1} y1={26 + (i % 2)} x2={short ? x + 0.6 : x - 0.8} y2={short ? 27 + (i % 2) : 30 + (i % 2)} />
    ))}
  </g>
);

// Vločky: počet 1-5
const Flakes = ({ count = 3 }) => (
  <g fill={SNOW}>
    {DROP_X[count].map((x, i) => (
      <circle key={i} cx={x} cy={28 + (i % 2) * 1.6} r="1.6" />
    ))}
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
  mostlyClear: () => (
    <g>
      <SunShape cx={14} cy={13} r={5.5} />
      <CloudShape x={10} y={11} s={0.6} />
    </g>
  ),
  mostlyClearNight: () => (
    <g>
      <MoonShape x={0} y={0} s={0.85} />
      <CloudShape x={10} y={11} s={0.6} />
    </g>
  ),
  mostlyCloudy: () => (
    <g>
      <SunShape cx={21} cy={9} r={3.5} />
      <CloudShape fill={CLOUD_DARK} x={6} y={-1} s={0.75} />
      <CloudShape x={0} y={4} />
    </g>
  ),
  cloud: () => (
    <g>
      <CloudShape fill={CLOUD_DARK} x={6} y={-2} s={0.75} />
      <CloudShape x={0} y={4} />
    </g>
  ),
  drizzle: () => (
    <g>
      <CloudShape x={0} y={-2} />
      <Drops count={3} short />
    </g>
  ),
  lightRain: () => (
    <g>
      <CloudShape x={0} y={-2} />
      <Drops count={2} />
    </g>
  ),
  rain: () => (
    <g>
      <CloudShape x={0} y={-2} />
      <Drops count={3} />
    </g>
  ),
  heavyRain: () => (
    <g>
      <CloudShape fill={CLOUD_DARK} x={0} y={-2} />
      <Drops count={5} />
    </g>
  ),
  showers: () => (
    <g>
      <SunShape cx={11} cy={9} r={4} />
      <CloudShape x={3} y={-1} s={0.9} />
      <Drops count={2} />
    </g>
  ),
  showersNight: () => (
    <g>
      <MoonShape x={-3} y={-4} s={0.65} />
      <CloudShape x={3} y={-1} s={0.9} />
      <Drops count={2} />
    </g>
  ),
  sleet: () => (
    <g>
      <CloudShape x={0} y={-2} />
      <line x1="12" y1="26" x2="10.5" y2="29.5" stroke={RAIN} strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="28" r="1.6" fill={SNOW} />
    </g>
  ),
  lightSnow: () => (
    <g>
      <CloudShape x={0} y={-2} />
      <Flakes count={2} />
    </g>
  ),
  snow: () => (
    <g>
      <CloudShape x={0} y={-2} />
      <Flakes count={3} />
    </g>
  ),
  heavySnow: () => (
    <g>
      <CloudShape fill={CLOUD_DARK} x={0} y={-2} />
      <Flakes count={5} />
    </g>
  ),
  storm: () => (
    <g>
      <CloudShape fill={CLOUD_DARK} x={0} y={-3} />
      <path d="M17 19l-4 6h3.5l-2 6 6-8h-3.5l2-4z" fill={BOLT} />
    </g>
  ),
  mist: () => (
    <g opacity="0.85">
      <CloudShape x={0} y={-4} />
      <line x1="8" y1="25" x2="24" y2="25" stroke={CLOUD} strokeWidth="2" strokeLinecap="round" />
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
  // Obecná ikona, když o oblačnosti nic nevíme: teploměr se sloupcem podle teploty
  generic: (temperature) => {
    const hasTemp = isNum(temperature);
    // -20 °C = prázdný, 35 °C = plný sloupec (y 22 -> 6)
    const ratio = hasTemp ? Math.max(0, Math.min(1, (temperature + 20) / 55)) : 0;
    const top = 22 - ratio * 16;
    const color = hasTemp ? tempColor(temperature) : "#4b5160";
    return (
      <g>
        <rect x="12.5" y="3" width="7" height="22" rx="3.5" fill="rgba(255,255,255,0.08)" />
        <circle cx="16" cy="24.5" r="5.5" fill="rgba(255,255,255,0.08)" />
        <rect x="14.5" y={top} width="3" height={24 - top} rx="1.5" fill={color} />
        <circle cx="16" cy="24.5" r="3.5" fill={color} />
        <g stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeLinecap="round">
          <line x1="21.5" y1="8" x2="23.5" y2="8" />
          <line x1="21.5" y1="12" x2="23" y2="12" />
          <line x1="21.5" y1="16" x2="23.5" y2="16" />
        </g>
      </g>
    );
  },
};

const WeatherIcon = ({ type, temperature }) => (
  <svg viewBox="0 0 32 32">{(icons[type] || icons.generic)(temperature)}</svg>
);

// Šipka ukazuje, kam vítr fouká (směr v datech je odkud fouká)
const WindArrow = ({ direction }) => (
  <svg viewBox="0 0 12 12" style={{ transform: `rotate(${direction + 180}deg)` }}>
    <path d="M6 1l3.5 8L6 7.2 2.5 9z" fill="#7dd3fc" />
  </svg>
);

// ---------- komponenty ----------

// Síla větru z dat (číselník "wind_level"): počet dílků stupnice, popis a barva
const WIND_LEVELS = {
  calm: { bars: 1, label: "bezvětří", color: "#7dd3fc", chip: "" },
  breeze: { bars: 2, label: "mírný vítr", color: "#7dd3fc", chip: "" },
  windy: { bars: 3, label: "silný vítr", color: "#f59e0b", chip: "windy" },
  strong: { bars: 4, label: "velmi silný vítr", color: "#fb923c", chip: "windy" },
  storm: { bars: 5, label: "vichřice", color: "#ef4444", chip: "storm" },
};

const Wind = ({ peak }) => {
  const level = WIND_LEVELS[peak.wind_level];
  if (!level) return null;

  return (
    <span className={`chip ${level.chip}`}>
      {isNum(peak.wind_direction) && <WindArrow direction={peak.wind_direction} />}
      <span className="bars">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="bar"
            style={{ height: 4 + i * 1.6, background: i <= level.bars ? level.color : undefined }}
          />
        ))}
      </span>
      {level.label}
    </span>
  );
};

const Peak = ({ peak, now }) => {
  const date = parseTime(peak.time);
  const hasTemp = isNum(peak.temperature);
  const ageMinutes = date ? (now - date) / 60000 : Infinity;
  const status = !hasTemp ? "offline" : ageMinutes > STALE_MINUTES ? "stale" : "";
  const condition = hasTemp ? getIcon(peak, date) : "generic";

  return (
    <div className={`peak ${status === "offline" ? "offline" : ""}`} onClick={() => openUrl(peak.preview_url)}>
      <div className="icon">
        <WeatherIcon type={condition} temperature={peak.temperature} />
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
          {isNum(peak.precipitation) && peak.precipitation > 0 && (
            <span className="chip">
              {fmt(peak.precipitation)}
              <span className="muted">mm</span>
            </span>
          )}
        </div>

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

// Čas aktualizace z odpovědi GitHub API (poslední commit s daty)
const parseUpdated = (text) => {
  try {
    const date = new Date(JSON.parse(text)[0].commit.committer.date);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch (e) {
    return null;
  }
};

// Odpočet do dalšího načtení dat widgetem, přepočítává se každých 30 s
const Countdown = ({ nextAt }) => {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    return () => clearInterval(timer);
  }, [nextAt]);

  const minutes = Math.ceil((nextAt - Date.now()) / 60000);
  return <span className="next">{minutes > 0 ? `další za ${minutes} min` : "načítám…"}</span>;
};

const Footer = ({ updated, now }) => {
  const nextAt = now.getTime() + refreshFrequency;
  const minutes = updated ? (now - updated) / 60000 : Infinity;
  const status =
    minutes <= FOOTER_OK_MINUTES ? "" : minutes <= FOOTER_STALE_MINUTES ? "stale" : "old";

  return (
    <div className="footer">
      <Countdown nextAt={nextAt} />
      {updated && (
        <>
          <span className={`dot ${status}`} />
          aktualizováno {formatTime(updated, now)}
        </>
      )}
    </div>
  );
};

export const render = ({ output, error }) => {
  const [dataText, commitsText = ""] = (output || "").split(SEPARATOR);

  let peaks = null;
  try {
    peaks = JSON.parse(dataText);
  } catch (e) {
    peaks = null;
  }

  const now = new Date();

  if (!Array.isArray(peaks)) {
    return <div className="error">Data se nepodařilo načíst{error ? `: ${error}` : ""}</div>;
  }

  // Pořadí je dané daty, vrcholy bez dat jdou na konec
  const sorted = [...peaks].sort((a, b) => !isNum(a.temperature) - !isNum(b.temperature));

  // Bez odpovědi GitHub API (např. vyčerpaný limit) použijeme nejnovější čas měření
  const newestMeasurement = peaks
    .filter((peak) => isNum(peak.temperature))
    .map((peak) => parseTime(peak.time))
    .filter(Boolean)
    .sort((a, b) => b - a)[0];
  const updated = parseUpdated(commitsText) || newestMeasurement || null;

  return (
    <div>
      {sorted.map((peak) => (
        <Peak key={peak.code} peak={peak} now={now} />
      ))}
      <Footer updated={updated} now={now} />
    </div>
  );
};

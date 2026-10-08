// PeakWeather – widget pro Übersicht (https://tracesof.net/uebersicht/)
// Zobrazuje aktuální počasí z vrcholů Beskyd a okolí z data/peakweather.json.
// Instalace: zkopíruj soubor do složky widgetů Übersichtu (menu → Open Widgets Folder).

import { run } from "uebersicht";

const DATA_URL =
  "https://raw.githubusercontent.com/jenikkuchar/PeakWeather/main/data/peakweather.json";

// Data starší než tolik minut se označí jako neaktuální
const STALE_MINUTES = 90;

// Parametr t obchází cache GitHubu (jinak se data mění až po ~5 minutách)
export const command = `curl -sf --max-time 15 "${DATA_URL}?t=$(date +%s)"`;

// 5 minut – workflow data aktualizuje každých 15 minut
export const refreshFrequency = 5 * 60 * 1000;

export const className = `
  top: 20px;
  left: 20px;
  width: 360px;
  box-sizing: border-box;
  padding: 16px 16px 10px;
  color: #e6e8ee;
  font-family: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
  font-size: 12px;
  background: rgba(18, 20, 26, 0.72);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin: 0 4px 10px;
  }
  .title {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #ffffff;
  }
  .updated {
    font-size: 11px;
    color: #8a90a0;
  }

  .peak {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 8px;
    border-radius: 12px;
    cursor: pointer;
  }
  .peak + .peak {
    margin-top: 2px;
  }
  .peak:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .info {
    flex: 1;
    min-width: 0;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #f2f4f8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4ade80;
  }
  .dot.stale {
    background: #f59e0b;
  }
  .dot.offline {
    background: #6b7280;
  }
  .time {
    margin-left: auto;
    font-size: 11px;
    font-weight: 400;
    color: #8a90a0;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 4px;
    color: #a9afbd;
    font-size: 11.5px;
  }
  .stat {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
  }
  .stat .label {
    color: #6b7180;
  }
  .arrow {
    display: inline-block;
    font-size: 11px;
    color: #7dd3fc;
  }
  .details {
    margin-top: 3px;
    font-size: 11px;
    color: #8a90a0;
    font-style: italic;
  }

  .temp {
    flex: none;
    min-width: 64px;
    text-align: right;
    font-size: 26px;
    font-weight: 300;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .temp .unit {
    font-size: 14px;
    color: #8a90a0;
    margin-left: 1px;
  }
  .temp.missing {
    font-size: 20px;
    color: #4b5160;
  }

  .error {
    margin: 4px;
    color: #fca5a5;
  }
`;

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

const openUrl = (url) => {
  if (url) run(`open "${url}"`);
};

const Peak = ({ peak, now }) => {
  const date = parseTime(peak.time);
  const hasTemp = isNum(peak.temperature);
  const ageMinutes = date ? (now - date) / 60000 : Infinity;
  const status = !hasTemp ? "offline" : ageMinutes > STALE_MINUTES ? "stale" : "";

  return (
    <div className="peak" onClick={() => openUrl(peak.preview_url)}>
      <div className="info">
        <div className="name">
          <span className={`dot ${status}`} />
          {peak.peak}
          <span className="time">{formatTime(date, now)}</span>
        </div>

        <div className="stats">
          {isNum(peak.wind) && (
            <span className="stat">
              {isNum(peak.wind_direction) && (
                // Šipka ukazuje, kam vítr fouká (směr je odkud fouká)
                <span
                  className="arrow"
                  style={{ transform: `rotate(${peak.wind_direction + 180}deg)` }}
                >
                  ↑
                </span>
              )}
              {fmt(peak.wind)}
              {isNum(peak.wind_gust) && <span className="label">/{fmt(peak.wind_gust)}</span>}
              <span className="label">m/s</span>
            </span>
          )}
          {!isNum(peak.wind) && isNum(peak.wind_gust) && (
            <span className="stat">
              <span className="label">nárazy</span>
              {fmt(peak.wind_gust)}
              <span className="label">m/s</span>
            </span>
          )}
          {isNum(peak.humidity) && (
            <span className="stat">
              <span className="label">vlhk.</span>
              {fmt(peak.humidity, 0)}%
            </span>
          )}
          {isNum(peak.precipitation) && (
            <span className="stat">
              <span className="label">srážky</span>
              {fmt(peak.precipitation)}
              <span className="label">mm</span>
            </span>
          )}
          {!hasTemp && <span className="stat label">data nedostupná</span>}
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

  return (
    <div>
      <div className="header">
        <span className="title">PeakWeather</span>
        <span className="updated">
          {now.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {Array.isArray(peaks) ? (
        peaks.map((peak) => <Peak key={peak.code} peak={peak} now={now} />)
      ) : (
        <div className="error">Data se nepodařilo načíst{error ? `: ${error}` : ""}</div>
      )}
    </div>
  );
};

// PeakWeather – widget pro Scriptable (iOS, https://scriptable.app)
// Zobrazuje aktuální počasí z vrcholů Beskyd a okolí z data/peakweather.json.
// Instalace: v aplikaci Scriptable vytvoř nový skript, vlož tento kód a přidej
// na plochu widget Scriptable (střední nebo velký) s tímto skriptem.

const DATA_URL =
  "https://raw.githubusercontent.com/jenikkuchar/PeakWeather/main/data/peakweather.json";
// Čas posledního commitu s daty = čas aktualizace
const COMMITS_URL =
  "https://api.github.com/repos/jenikkuchar/PeakWeather/commits?path=data/peakweather.json&per_page=1";

// Data starší než tolik minut mají u vrcholu oranžovou tečku
const STALE_MINUTES = 60;
// Stáří aktualizace v patičce: zelená do 30 min, oranžová do 60 min, pak červená
const FOOTER_OK_MINUTES = 30;
const FOOTER_STALE_MINUTES = 60;
// Jak často má iOS widget obnovit (systém to může posunout)
const REFRESH_MINUTES = 15;

// Poloha pro výpočet dne/noci (Beskydy)
const LAT = 49.5;
const LON = 18.2;

// Kolik vrcholů se vejde do jednotlivých velikostí widgetu
const MAX_ROWS = { small: 3, medium: 3, large: 9, extraLarge: 9 };

const COLORS = {
  bgTop: new Color("#1e222c"),
  bgBottom: new Color("#0e1016"),
  text: new Color("#f4f6fa"),
  muted: new Color("#7c8394"),
  green: new Color("#4ade80"),
  orange: new Color("#f59e0b"),
  red: new Color("#ef4444"),
  gray: new Color("#6b7280"),
  barOff: new Color("#ffffff", 0.14),
  sun: new Color("#fbbf24"),
  moon: new Color("#c7d2fe"),
  cloud: new Color("#cbd5e1"),
  rain: new Color("#60a5fa"),
  snow: new Color("#e0f2fe"),
  bolt: new Color("#facc15"),
};

// ---------- pomocné funkce ----------

const isNum = (v) => typeof v === "number" && !Number.isNaN(v);

const fmt = (v, digits = 1) => v.toFixed(digits).replace(".", ",");

// "08.10.2026 21:50" -> Date
const parseTime = (text) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/.exec(text || "");
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]) : null;
};

const pad = (n) => String(n).padStart(2, "0");

const formatTime = (date, now) => {
  if (!date) return "";
  const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return date.toDateString() === now.toDateString()
    ? hm
    : `${date.getDate()}. ${date.getMonth() + 1}. ${hm}`;
};

// Barva teploty od mrazu po vedro
const tempColor = (t) => {
  if (t <= -10) return new Color("#a5b4fc");
  if (t <= 0) return new Color("#7dd3fc");
  if (t <= 10) return new Color("#a7f3d0");
  if (t <= 20) return new Color("#fde68a");
  if (t <= 28) return new Color("#fdba74");
  return new Color("#fca5a5");
};

// Výška Slunce nad obzorem ve stupních (zjednodušený výpočet NOAA)
const sunElevation = (date) => {
  const rad = Math.PI / 180;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (date.getTime() - start) / 86400000;
  const g = ((2 * Math.PI) / 365) * (day - 1);
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const eqTime =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const solarMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + eqTime + 4 * LON;
  const hourAngle = (solarMinutes / 4 - 180) * rad;
  const cosZenith =
    Math.sin(LAT * rad) * Math.sin(decl) + Math.cos(LAT * rad) * Math.cos(decl) * Math.cos(hourAngle);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZenith))) / rad;
};

// ---------- ikony počasí (SF Symbols) ----------

// Stav počasí z dat (číselník "condition") -> [symbol ve dne, symbol v noci, barva]
const CONDITION_ICONS = {
  clear: ["sun.max.fill", "moon.stars.fill", "sun"],
  mostly_clear: ["sun.min.fill", "moon.fill", "sun"],
  partly_cloudy: ["cloud.sun.fill", "cloud.moon.fill", "cloud"],
  mostly_cloudy: ["cloud.sun.fill", "cloud.moon.fill", "cloud"],
  cloudy: ["cloud.fill", null, "cloud"],
  mist: ["cloud.fog", null, "cloud"],
  fog: ["cloud.fog.fill", null, "cloud"],
  drizzle: ["cloud.drizzle.fill", null, "rain"],
  light_rain: ["cloud.rain", null, "rain"],
  rain: ["cloud.rain.fill", null, "rain"],
  heavy_rain: ["cloud.heavyrain.fill", null, "rain"],
  showers: ["cloud.sun.rain.fill", "cloud.moon.rain.fill", "rain"],
  sleet: ["cloud.sleet.fill", null, "snow"],
  light_snow: ["cloud.snow", null, "snow"],
  snow: ["cloud.snow.fill", null, "snow"],
  heavy_snow: ["snowflake", null, "snow"],
  storm: ["cloud.bolt.rain.fill", null, "bolt"],
};

// Vrací { name, color } pro ikonu vrcholu
const getIcon = (peak, date) => {
  if (!isNum(peak.temperature)) return { name: "thermometer.medium", color: COLORS.gray };

  const icon = CONDITION_ICONS[peak.condition];
  if (!icon) {
    // O počasí nic nevíme: teploměr podle teploty
    const t = peak.temperature;
    const name = t <= 0 ? "thermometer.low" : t >= 20 ? "thermometer.high" : "thermometer.medium";
    return { name, color: tempColor(t) };
  }

  const night = sunElevation(date || new Date()) < -0.8;
  const [day, nightName, colorKey] = icon;
  if (night && nightName) return { name: nightName, color: COLORS.moon };
  return { name: day, color: COLORS[colorKey] };
};

const symbolImage = (name) => {
  const symbol = SFSymbol.named(name) || SFSymbol.named("thermometer.medium");
  symbol.applyFont(Font.systemFont(20));
  return symbol.image;
};

// ---------- vítr: šipka směru + pětidílková stupnice ----------

const WIND_LEVELS = {
  calm: { bars: 1, label: "bezvětří", color: "#7dd3fc" },
  breeze: { bars: 2, label: "mírný vítr", color: "#7dd3fc" },
  windy: { bars: 3, label: "silný vítr", color: "#f59e0b" },
  strong: { bars: 4, label: "velmi silný vítr", color: "#fb923c" },
  storm: { bars: 5, label: "vichřice", color: "#ef4444" },
};

// Kreslí šipku (kam vítr fouká) a stupnici do jednoho obrázku
const windImage = (level, direction) => {
  const scale = 3;
  const width = isNum(direction) ? 38 : 24;
  const height = 12;
  const ctx = new DrawContext();
  ctx.size = new Size(width * scale, height * scale);
  ctx.opaque = false;
  ctx.respectScreenScale = false;

  let x = 0;
  if (isNum(direction)) {
    // Šipka otočená o směr + 180° (data udávají, odkud vítr fouká)
    const angle = ((direction + 180) * Math.PI) / 180;
    const cx = 5.5 * scale;
    const cy = 6 * scale;
    const pts = [[0, -5], [3.5, 4], [0, 2], [-3.5, 4]].map(([px, py]) => {
      const rx = px * Math.cos(angle) - py * Math.sin(angle);
      const ry = px * Math.sin(angle) + py * Math.cos(angle);
      return new Point(cx + rx * scale, cy + ry * scale);
    });
    const path = new Path();
    path.addLines(pts);
    path.closeSubpath();
    ctx.addPath(path);
    ctx.setFillColor(new Color("#7dd3fc"));
    ctx.fillPath();
    x = 14;
  }

  const active = new Color(level.color);
  for (let i = 1; i <= 5; i++) {
    const barHeight = 3 + i * 1.6;
    const rect = new Rect((x + (i - 1) * 5) * scale, (height - barHeight) * scale, 3.5 * scale, barHeight * scale);
    const path = new Path();
    path.addRoundedRect(rect, 1.2 * scale, 1.2 * scale);
    ctx.addPath(path);
    ctx.setFillColor(i <= level.bars ? active : COLORS.barOff);
    ctx.fillPath();
  }
  return ctx.getImage();
};

// Malá barevná tečka (stav dat)
const dotImage = (color) => {
  const ctx = new DrawContext();
  ctx.size = new Size(12, 12);
  ctx.opaque = false;
  ctx.respectScreenScale = false;
  ctx.setFillColor(color);
  ctx.fillEllipse(new Rect(0, 0, 12, 12));
  return ctx.getImage();
};

// ---------- data ----------

const loadJSON = async (url) => {
  const request = new Request(url);
  request.timeoutInterval = 15;
  return request.loadJSON();
};

const loadData = async () => {
  // Parametr t obchází cache GitHubu
  const peaks = await loadJSON(`${DATA_URL}?t=${Date.now()}`);
  let updated = null;
  try {
    const commits = await loadJSON(COMMITS_URL);
    updated = new Date(commits[0].commit.committer.date);
    if (Number.isNaN(updated.getTime())) updated = null;
  } catch (e) {
    updated = null;
  }
  if (!updated) {
    // Bez GitHub API použijeme nejnovější čas měření
    updated = peaks
      .filter((p) => isNum(p.temperature))
      .map((p) => parseTime(p.time))
      .filter(Boolean)
      .sort((a, b) => b - a)[0] || null;
  }
  return { peaks, updated };
};

// ---------- vykreslení ----------

const addPeakRow = (widget, peak, now, compact) => {
  const date = parseTime(peak.time);
  const hasTemp = isNum(peak.temperature);
  const ageMinutes = date ? (now - date) / 60000 : Infinity;
  const statusColor = !hasTemp ? COLORS.gray : ageMinutes > STALE_MINUTES ? COLORS.orange : COLORS.green;

  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  if (peak.preview_url) row.url = peak.preview_url;

  // Ikona počasí
  const icon = getIcon(peak, date);
  const iconBox = row.addStack();
  iconBox.size = new Size(30, 30);
  iconBox.cornerRadius = 9;
  iconBox.backgroundColor = new Color("#ffffff", 0.06);
  iconBox.centerAlignContent();
  const iconImage = iconBox.addImage(symbolImage(icon.name));
  iconImage.imageSize = new Size(20, 20);
  iconImage.tintColor = icon.color;
  row.addSpacer(10);

  // Název, čas a vítr
  const info = row.addStack();
  info.layoutVertically();

  const nameLine = info.addStack();
  nameLine.layoutHorizontally();
  nameLine.centerAlignContent();
  const name = nameLine.addText(peak.peak);
  name.font = Font.semiboldSystemFont(13);
  name.textColor = hasTemp ? COLORS.text : COLORS.muted;
  name.lineLimit = 1;
  name.minimumScaleFactor = 0.8;
  if (!compact) {
    nameLine.addSpacer(5);
    const dot = nameLine.addImage(dotImage(statusColor));
    dot.imageSize = new Size(5, 5);
    nameLine.addSpacer(3);
    const time = nameLine.addText(hasTemp ? formatTime(date, now) : "bez dat");
    time.font = Font.mediumSystemFont(10);
    time.textColor = COLORS.muted;
  }

  const level = WIND_LEVELS[peak.wind_level];
  if (level && !compact) {
    info.addSpacer(2);
    const windLine = info.addStack();
    windLine.layoutHorizontally();
    windLine.centerAlignContent();
    const wind = windLine.addImage(windImage(level, peak.wind_direction));
    wind.imageSize = new Size(isNum(peak.wind_direction) ? 38 : 24, 12);
    windLine.addSpacer(5);
    const label = windLine.addText(level.label);
    label.font = Font.systemFont(11);
    label.textColor = level.bars >= 3 ? new Color(level.color) : new Color("#c3c8d4");
  }

  row.addSpacer();

  // Teplota
  const temp = row.addText(hasTemp ? `${fmt(peak.temperature)}°` : "–");
  temp.font = Font.lightSystemFont(compact ? 20 : 24);
  temp.textColor = hasTemp ? tempColor(peak.temperature) : COLORS.gray;
  temp.lineLimit = 1;
  temp.minimumScaleFactor = 0.7;
};

const addFooter = (widget, updated, now) => {
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  footer.addSpacer();
  if (!updated) return;

  const minutes = (now - updated) / 60000;
  const color =
    minutes <= FOOTER_OK_MINUTES ? COLORS.green : minutes <= FOOTER_STALE_MINUTES ? COLORS.orange : COLORS.red;
  const dot = footer.addImage(dotImage(color));
  dot.imageSize = new Size(5, 5);
  footer.addSpacer(4);
  const text = footer.addText(`aktualizováno ${formatTime(updated, now)}`);
  text.font = Font.mediumSystemFont(10);
  text.textColor = COLORS.muted;
};

const createWidget = async () => {
  const widget = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [COLORS.bgTop, COLORS.bgBottom];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
  widget.setPadding(12, 14, 10, 14);
  widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);

  const family = config.widgetFamily || "large";
  const compact = family === "small";
  const now = new Date();

  let data;
  try {
    data = await loadData();
  } catch (e) {
    const error = widget.addText("Data se nepodařilo načíst");
    error.font = Font.systemFont(12);
    error.textColor = new Color("#fca5a5");
    return widget;
  }

  // Pořadí je dané daty, vrcholy bez dat jdou na konec
  const peaks = [...data.peaks]
    .sort((a, b) => !isNum(a.temperature) - !isNum(b.temperature))
    .slice(0, MAX_ROWS[family] || 9);

  peaks.forEach((peak, i) => {
    if (i > 0) widget.addSpacer();
    addPeakRow(widget, peak, now, compact);
  });

  if (!compact) {
    widget.addSpacer();
    addFooter(widget, data.updated, now);
  }
  return widget;
};

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  // Náhled při spuštění v aplikaci
  await widget.presentLarge();
}
Script.complete();

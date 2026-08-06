const WEATHER_CODES = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Depositing rime fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  56: "Light freezing drizzle", 57: "Dense freezing drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  66: "Light freezing rain", 67: "Heavy freezing rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
  85: "Slight snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
};

const SUN_CODES = new Set([0, 1]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

const ICON_SVGS = {
  sun: '<svg viewBox="0 0 24 24" class="wicon" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="#e8a33d"/><g stroke="#e8a33d" stroke-width="2"><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/><line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/></g></svg>',
  cloud: '<svg viewBox="0 0 24 24" class="wicon" aria-hidden="true"><ellipse cx="10" cy="14" rx="7" ry="5" fill="#c4ccd4"/><ellipse cx="15" cy="12" rx="5" ry="4" fill="#aeb8c2"/></svg>',
  rain: '<svg viewBox="0 0 24 24" class="wicon" aria-hidden="true"><ellipse cx="10" cy="10" rx="7" ry="5" fill="#b9c1c9"/><ellipse cx="15" cy="8" rx="5" ry="4" fill="#a3adb7"/><g stroke="#5b8ab0" stroke-width="2"><line x1="8" y1="17" x2="7" y2="21"/><line x1="13" y1="17" x2="12" y2="21"/><line x1="18" y1="17" x2="17" y2="21"/></g></svg>',
  snow: '<svg viewBox="0 0 24 24" class="wicon" aria-hidden="true"><ellipse cx="10" cy="10" rx="7" ry="5" fill="#c4ccd4"/><ellipse cx="15" cy="8" rx="5" ry="4" fill="#aeb8c2"/><g fill="#7d8b98"><circle cx="8" cy="19" r="1.3"/><circle cx="13" cy="19" r="1.3"/><circle cx="18" cy="19" r="1.3"/></g></svg>',
};

const EVENING_START_HOUR = 18;
const EVENING_END_HOUR = 21;

const els = {
  form: document.getElementById("compare-form"),
  locationA: document.getElementById("location-a"),
  locationB: document.getElementById("location-b"),
  swapBtn: document.getElementById("swap-btn"),
  compareBtn: document.getElementById("compare-btn"),
  errorMessage: document.getElementById("error-message"),
  results: document.getElementById("results"),
  skeleton: document.getElementById("skeleton"),
  aiPanel: document.getElementById("ai-panel"),
  aiText: document.getElementById("ai-text"),
  comparisonTitle: document.getElementById("comparison-title"),
  statsGrid: document.getElementById("stats-grid"),
};

const segContainers = {
  a: document.querySelector('.date-seg[data-side="a"]'),
  b: document.querySelector('.date-seg[data-side="b"]'),
};
const customInputs = {
  a: document.getElementById("custom-date-a"),
  b: document.getElementById("custom-date-b"),
};

const state = {
  a: { mode: "today", customDate: null },
  b: { mode: "today", customDate: null },
};

function isoFromDate(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return isoFromDate(new Date());
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoFromDate(d);
}

function resolveDateString(side) {
  const s = state[side];
  if (s.mode === "yesterday") return yesterdayISO();
  if (s.mode === "custom") return s.customDate || todayISO();
  return todayISO();
}

function humanDateLabel(side) {
  const s = state[side];
  if (s.mode === "today") return "today";
  if (s.mode === "yesterday") return "yesterday";
  const iso = s.customDate || todayISO();
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function setSideMode(side, mode) {
  state[side].mode = mode;
  segContainers[side].querySelectorAll(".seg-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  const input = customInputs[side];
  if (mode === "custom") {
    if (!state[side].customDate) state[side].customDate = todayISO();
    input.value = state[side].customDate;
    input.hidden = false;
    input.focus();
  } else {
    input.hidden = true;
  }
  updateCustomLabel(side);
}

function updateCustomLabel(side) {
  const btn = segContainers[side].querySelector('[data-mode="custom"]');
  btn.textContent = state[side].customDate
    ? new Date(`${state[side].customDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "Custom";
}

["a", "b"].forEach((side) => {
  segContainers[side].querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => setSideMode(side, btn.dataset.mode));
  });
  customInputs[side].addEventListener("change", (event) => {
    state[side].customDate = event.target.value;
    updateCustomLabel(side);
  });
  setSideMode(side, "today");
});

els.swapBtn.addEventListener("click", () => {
  [els.locationA.value, els.locationB.value] = [els.locationB.value, els.locationA.value];
  [state.a, state.b] = [state.b, state.a];
  customInputs.a.value = state.a.customDate || todayISO();
  customInputs.b.value = state.b.customDate || todayISO();
  setSideMode("a", state.a.mode);
  setSideMode("b", state.b.mode);
});

document.querySelectorAll(".try-btn").forEach((btn) => {
  btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
});

function applyPreset(name) {
  if (name === "today-yesterday") {
    const city = els.locationA.value.trim() || els.locationB.value.trim() || "London";
    els.locationA.value = city;
    els.locationB.value = city;
    setSideMode("a", "today");
    setSideMode("b", "yesterday");
  } else if (name === "home-away") {
    els.locationA.value = "London";
    els.locationB.value = "Reykjavik";
    setSideMode("a", "today");
    setSideMode("b", "today");
  }
  els.form.scrollIntoView({ behavior: "smooth", block: "start" });
  runComparison();
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runComparison();
});

function showError(message) {
  els.errorMessage.textContent = message;
  els.errorMessage.hidden = false;
}

function clearError() {
  els.errorMessage.hidden = true;
  els.errorMessage.textContent = "";
}

function setLoading(isLoading) {
  els.compareBtn.disabled = isLoading;
  els.compareBtn.textContent = isLoading ? "Comparing…" : "Compare weather";
}

function showSkeleton() {
  els.skeleton.hidden = false;
  els.aiPanel.hidden = true;
}

function hideSkeleton() {
  els.skeleton.hidden = true;
}

async function geocode(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding request failed for "${name}".`);
  const data = await res.json();
  const hit = data.results?.[0];
  if (!hit) throw new Error(`Couldn't find a place called "${name}".`);
  const region = [hit.admin1, hit.country].filter(Boolean).join(", ");
  return {
    latitude: hit.latitude,
    longitude: hit.longitude,
    label: region ? `${hit.name}, ${region}` : hit.name,
    timezone: hit.timezone,
  };
}

function daysFromToday(dateStr) {
  const today = new Date(`${todayISO()}T00:00:00Z`);
  const target = new Date(`${dateStr}T00:00:00Z`);
  return Math.round((target - today) / 86400000);
}

function averageForHours(hourly, dateStr, key, hourPredicate) {
  if (!hourly?.time) return null;
  const vals = [];
  hourly.time.forEach((t, i) => {
    if (!t.startsWith(dateStr)) return;
    const hour = Number(t.slice(11, 13));
    if (hourPredicate(hour) && hourly[key]?.[i] != null) vals.push(hourly[key][i]);
  });
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

async function fetchWeather(place, dateStr) {
  const offset = daysFromToday(dateStr);
  const useForecast = offset >= -92 && offset <= 16;
  const base = useForecast
    ? "https://api.open-meteo.com/v1/forecast"
    : "https://archive-api.open-meteo.com/v1/archive";

  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    start_date: dateStr,
    end_date: dateStr,
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code",
    hourly: "temperature_2m,apparent_temperature,relative_humidity_2m",
    timezone: "auto",
  });

  const res = await fetch(`${base}?${params.toString()}`);
  const data = await res.json();
  if (data.error) {
    throw new Error(`No weather data for ${place.label} on ${dateStr}: ${data.reason || "out of range"}.`);
  }

  const daily = data.daily;
  if (!daily || daily.time?.[0] !== dateStr || daily.temperature_2m_max?.[0] == null) {
    throw new Error(`No weather data available for ${place.label} on ${dateStr}.`);
  }

  const inEvening = (h) => h >= EVENING_START_HOUR && h <= EVENING_END_HOUR;

  return {
    label: place.label,
    date: dateStr,
    weatherCode: daily.weather_code[0],
    weatherDesc: WEATHER_CODES[daily.weather_code[0]] || "Unknown",
    tempMax: daily.temperature_2m_max[0],
    tempMin: daily.temperature_2m_min[0],
    precipitation: daily.precipitation_sum[0],
    windMax: daily.wind_speed_10m_max[0],
    eveningTemp: averageForHours(data.hourly, dateStr, "temperature_2m", inEvening),
    eveningFeelsLike: averageForHours(data.hourly, dateStr, "apparent_temperature", inEvening),
    humidity: averageForHours(data.hourly, dateStr, "relative_humidity_2m", () => true),
  };
}

function round(n, decimals = 1) {
  if (n == null) return null;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function weatherIconType(code) {
  if (SUN_CODES.has(code)) return "sun";
  if (SNOW_CODES.has(code)) return "snow";
  if (RAIN_CODES.has(code)) return "rain";
  return "cloud";
}

function weatherIconSVG(code) {
  return ICON_SVGS[weatherIconType(code)] || ICON_SVGS.cloud;
}

function buildComparisonTitle(a, b) {
  return `${a.label} ${a.dateLabel} (${round(a.tempMax)}°C, ${a.weatherDesc}) vs ${b.label} ${b.dateLabel} (${round(b.tempMax)}°C, ${b.weatherDesc})`;
}

function renderStats(a, b) {
  els.comparisonTitle.textContent = buildComparisonTitle(a, b);

  const rows = [
    { name: "Condition", a: a.weatherDesc, b: b.weatherDesc, unit: "", icon: true },
    { name: "High", a: a.tempMax, b: b.tempMax, unit: "°C" },
    { name: "Low", a: a.tempMin, b: b.tempMin, unit: "°C" },
    { name: "Evening (feels like)", a: a.eveningFeelsLike, b: b.eveningFeelsLike, unit: "°C" },
    { name: "Humidity", a: a.humidity, b: b.humidity, unit: "%", decimals: 0 },
    { name: "Rain", a: a.precipitation, b: b.precipitation, unit: "mm" },
    { name: "Max wind", a: a.windMax, b: b.windMax, unit: "km/h" },
  ];

  els.statsGrid.innerHTML = "";
  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "stat-row";

    const nameEl = document.createElement("div");
    nameEl.className = "stat-name";
    nameEl.textContent = row.name;
    rowEl.appendChild(nameEl);

    const isNumeric = typeof row.a === "number" && typeof row.b === "number";
    const decimals = row.decimals ?? 1;

    const renderVal = (weatherObj, value) => {
      const el = document.createElement("div");
      el.className = "stat-val";
      if (row.icon) {
        el.innerHTML = `${weatherIconSVG(weatherObj.weatherCode)}<span>${value}</span>`;
      } else {
        el.textContent = isNumeric ? `${round(value, decimals)}${row.unit}` : value ?? "—";
      }
      return el;
    };

    rowEl.appendChild(renderVal(a, row.a));

    const deltaEl = document.createElement("div");
    deltaEl.className = "stat-delta";
    if (isNumeric) {
      const diff = round(row.b - row.a, decimals);
      deltaEl.textContent = `${diff > 0 ? "+" : ""}${diff}${row.unit}`;
      if (diff > 0) deltaEl.classList.add("diff-up");
      if (diff < 0) deltaEl.classList.add("diff-down");
    } else {
      deltaEl.textContent = "—";
    }
    rowEl.appendChild(deltaEl);

    rowEl.appendChild(renderVal(b, row.b));

    els.statsGrid.appendChild(rowEl);
  }
}

async function requestComparison(a, b) {
  const res = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      a: { label: `${a.label} on ${a.date}`, summary: stripLabel(a) },
      b: { label: `${b.label} on ${b.date}`, summary: stripLabel(b) },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || "The AI comparison isn't available right now.");
    err.code = data.error;
    throw err;
  }
  return data.verdict;
}

function stripLabel({ label, date, ...summary }) {
  return summary;
}

async function runComparison() {
  clearError();
  setLoading(true);
  els.results.hidden = true;
  showSkeleton();

  try {
    const [placeA, placeB] = await Promise.all([
      geocode(els.locationA.value.trim()),
      geocode(els.locationB.value.trim()),
    ]);

    const [weatherA, weatherB] = await Promise.all([
      fetchWeather(placeA, resolveDateString("a")),
      fetchWeather(placeB, resolveDateString("b")),
    ]);
    weatherA.dateLabel = humanDateLabel("a");
    weatherB.dateLabel = humanDateLabel("b");

    renderStats(weatherA, weatherB);
    els.results.hidden = false;

    try {
      const verdict = await requestComparison(weatherA, weatherB);
      hideSkeleton();
      els.aiText.textContent = verdict;
      els.aiPanel.hidden = false;
    } catch (aiErr) {
      hideSkeleton();
      els.aiPanel.hidden = false;
      els.aiText.textContent =
        aiErr.code === "no_api_key" ? aiErr.message : `Couldn't generate the AI take: ${aiErr.message}`;
    }
  } catch (err) {
    els.results.hidden = true;
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

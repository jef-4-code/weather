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

const EVENING_START_HOUR = 18;
const EVENING_END_HOUR = 21;

const els = {
  form: document.getElementById("compare-form"),
  locationA: document.getElementById("location-a"),
  locationB: document.getElementById("location-b"),
  dateA: document.getElementById("date-a"),
  dateB: document.getElementById("date-b"),
  swapBtn: document.getElementById("swap-btn"),
  compareBtn: document.getElementById("compare-btn"),
  errorMessage: document.getElementById("error-message"),
  results: document.getElementById("results"),
  aiText: document.getElementById("ai-text"),
  colALabel: document.getElementById("col-a-label"),
  colBLabel: document.getElementById("col-b-label"),
  statsBody: document.getElementById("stats-body"),
};

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

els.dateA.value = todayISO();
els.dateB.value = todayISO();

els.swapBtn.addEventListener("click", () => {
  [els.locationA.value, els.locationB.value] = [els.locationB.value, els.locationA.value];
  [els.dateA.value, els.dateB.value] = [els.dateB.value, els.dateA.value];
});

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
  const today = new Date(todayISO() + "T00:00:00Z");
  const target = new Date(dateStr + "T00:00:00Z");
  return Math.round((target - today) / 86400000);
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
    hourly: "temperature_2m,apparent_temperature",
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

  const evening = averageEveningFigures(data.hourly, dateStr);

  return {
    label: place.label,
    date: dateStr,
    weatherCode: daily.weather_code[0],
    weatherDesc: WEATHER_CODES[daily.weather_code[0]] || "Unknown",
    tempMax: daily.temperature_2m_max[0],
    tempMin: daily.temperature_2m_min[0],
    precipitation: daily.precipitation_sum[0],
    windMax: daily.wind_speed_10m_max[0],
    eveningTemp: evening.temp,
    eveningFeelsLike: evening.feelsLike,
  };
}

function averageEveningFigures(hourly, dateStr) {
  if (!hourly?.time) return { temp: null, feelsLike: null };
  const temps = [];
  const feels = [];
  hourly.time.forEach((t, i) => {
    if (!t.startsWith(dateStr)) return;
    const hour = Number(t.slice(11, 13));
    if (hour >= EVENING_START_HOUR && hour <= EVENING_END_HOUR) {
      if (hourly.temperature_2m?.[i] != null) temps.push(hourly.temperature_2m[i]);
      if (hourly.apparent_temperature?.[i] != null) feels.push(hourly.apparent_temperature[i]);
    }
  });
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  return { temp: avg(temps), feelsLike: avg(feels) };
}

function round1(n) {
  return n == null ? null : Math.round(n * 10) / 10;
}

function renderTable(a, b) {
  els.colALabel.textContent = `${a.label} (${a.date})`;
  els.colBLabel.textContent = `${b.label} (${b.date})`;

  const rows = [
    { name: "Condition", a: a.weatherDesc, b: b.weatherDesc, unit: "" },
    { name: "High", a: a.tempMax, b: b.tempMax, unit: "°C" },
    { name: "Low", a: a.tempMin, b: b.tempMin, unit: "°C" },
    { name: "Evening (feels like)", a: a.eveningFeelsLike, b: b.eveningFeelsLike, unit: "°C" },
    { name: "Rain", a: a.precipitation, b: b.precipitation, unit: "mm" },
    { name: "Max wind", a: a.windMax, b: b.windMax, unit: "km/h" },
  ];

  els.statsBody.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = row.name;
    nameCell.className = "metric-name";
    tr.appendChild(nameCell);

    const isNumeric = typeof row.a === "number" && typeof row.b === "number";

    const aCell = document.createElement("td");
    aCell.textContent = isNumeric ? `${round1(row.a)}${row.unit}` : row.a ?? "—";
    tr.appendChild(aCell);

    const bCell = document.createElement("td");
    bCell.textContent = isNumeric ? `${round1(row.b)}${row.unit}` : row.b ?? "—";
    tr.appendChild(bCell);

    const diffCell = document.createElement("td");
    if (isNumeric) {
      const diff = round1(row.b - row.a);
      diffCell.textContent = `${diff > 0 ? "+" : ""}${diff}${row.unit}`;
      if (diff > 0) diffCell.classList.add("diff-up");
      if (diff < 0) diffCell.classList.add("diff-down");
    } else {
      diffCell.textContent = "—";
    }
    tr.appendChild(diffCell);

    els.statsBody.appendChild(tr);
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
  return data.comparison;
}

function stripLabel({ label, date, ...summary }) {
  return summary;
}

async function runComparison() {
  clearError();
  setLoading(true);
  els.results.hidden = true;
  els.aiText.className = "loading";
  els.aiText.textContent = "Thinking it through…";

  try {
    const [placeA, placeB] = await Promise.all([
      geocode(els.locationA.value.trim()),
      geocode(els.locationB.value.trim()),
    ]);

    const [weatherA, weatherB] = await Promise.all([
      fetchWeather(placeA, els.dateA.value),
      fetchWeather(placeB, els.dateB.value),
    ]);

    renderTable(weatherA, weatherB);
    els.results.hidden = false;

    try {
      const comparison = await requestComparison(weatherA, weatherB);
      els.aiText.className = "";
      els.aiText.textContent = comparison;
    } catch (aiErr) {
      els.aiText.className = "unavailable";
      els.aiText.textContent =
        aiErr.code === "no_api_key"
          ? aiErr.message
          : `Couldn't generate the AI take: ${aiErr.message}`;
    }
  } catch (err) {
    els.results.hidden = true;
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

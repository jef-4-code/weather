# Weather, Relatively

Weather doesn't mean much in isolation — "18°C" is only useful once you know what you're
comparing it to. This app lets you pick two location/date pairs (today vs. yesterday, home
vs. holiday destination, this city vs. that one) and get a plain-language answer to "so what
does that actually mean for me" — pack a jumper, bring an umbrella, don't bother with the coat.

- **Weather data**: [Open-Meteo](https://open-meteo.com) — free, no API key, fetched directly
  from the browser (forecast + historical archive, so any date roughly from 1940 to 16 days out
  works).
- **The comparison itself**: Claude (Anthropic API), called from a small Flask backend so the
  API key never reaches the browser.

## Setup

1. **Install dependencies** (Python 3.10+):

   ```bash
   pip install -r requirements.txt
   ```

2. **Add your Anthropic API key.** Copy `.env.example` to `.env` and fill in a key from
   [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys):

   ```bash
   cp .env.example .env
   ```

3. **Run it:**

   ```bash
   python server.py
   ```

   Then open <http://localhost:5001>.

Without a key set, the app still runs — you'll get the stats comparison table, just not the
AI-generated narrative (the UI tells you why).

## How it's put together

- `server.py` — Flask app. Serves `public/` and exposes one endpoint, `POST /api/compare`,
  which is the only thing that touches the Anthropic API.
- `public/index.html` / `style.css` — the page.
- `public/app.js` — all the client-side logic: geocode both locations via Open-Meteo, pick the
  forecast or historical-archive endpoint depending on how far the date is from today, pull
  daily highs/lows/rain/wind plus an evening (6–9pm) average, render the comparison table, then
  send both summaries to `/api/compare` for the narrative.

## Why a backend at all, for something this small

The Anthropic API key can't be called safely from client-side JavaScript — anyone could open
dev tools and steal it. So there's one small Flask endpoint whose only job is holding the key
and making that one call; everything else (weather data, geocoding, UI) is plain static
HTML/JS with no build step.

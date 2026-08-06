"""Weather, Relatively — backend.

Serves the static frontend and proxies the one call that needs a secret:
turning two weather summaries into a plain-language comparison via Claude.
Everything else (geocoding, the weather data itself) happens client-side
against Open-Meteo's free, keyless API.
"""

import json
import os
from pathlib import Path

# This machine sits behind a TLS-inspecting proxy whose root CA isn't in
# certifi's bundle. Route Python's SSL verification through the OS trust
# store instead, or every outbound HTTPS call (including to Anthropic) fails
# with SSLCertVerificationError. Harmless on networks that don't need it.
import truststore

truststore.inject_into_ssl()

import anthropic
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

load_dotenv()

BASE_DIR = Path(__file__).parent
PUBLIC_DIR = BASE_DIR / "public"
MODEL = "claude-opus-5"

SYSTEM_PROMPT = """You are the comparison engine behind "Weather, Relatively", a tool that \
tells people what weather actually means relative to somewhere else — not just the numbers.

You'll be given structured weather data for two location/date pairs, labeled A and B. Write a \
short comparison that translates the numbers into a practical takeaway.

Rules:
- 2-4 sentences. Plain language. No headers, no bullet points, no markdown.
- Lead with the single most useful takeaway (e.g. what to wear, whether to bring an umbrella).
- Cite at least one concrete number (a temperature or precipitation difference) to back the claim.
- If an evening figure is present for both, comment specifically on evening comfort (jumper \
weather or not) as well as the daytime picture.
- If the two are genuinely similar, say so plainly instead of inventing a difference.
- Refer to the locations by name, not "Location A/B"."""

app = Flask(__name__, static_folder=None)
_client = anthropic.Anthropic() if os.environ.get("ANTHROPIC_API_KEY") else None


@app.route("/")
def index():
    return send_from_directory(PUBLIC_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(PUBLIC_DIR, filename)


@app.route("/api/compare", methods=["POST"])
def compare():
    if _client is None:
        return jsonify(
            {
                "error": "no_api_key",
                "message": "Add ANTHROPIC_API_KEY to .env and restart the server "
                "to enable the AI comparison.",
            }
        ), 503

    payload = request.get_json(silent=True) or {}
    a, b = payload.get("a"), payload.get("b")
    if not a or not b:
        return jsonify(
            {"error": "bad_request", "message": "Missing weather data for one or both locations."}
        ), 400

    user_prompt = (
        f"Location A — {a['label']}:\n{json.dumps(a['summary'], indent=2)}\n\n"
        f"Location B — {b['label']}:\n{json.dumps(b['summary'], indent=2)}\n\n"
        "Write the comparison now."
    )

    try:
        response = _client.messages.create(
            model=MODEL,
            max_tokens=400,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except anthropic.APIStatusError as exc:
        return jsonify({"error": "anthropic_error", "message": str(exc)}), 502

    if response.stop_reason == "refusal":
        return jsonify(
            {"error": "refusal", "message": "Claude declined to answer this one — try different inputs."}
        ), 502

    text = "".join(block.text for block in response.content if block.type == "text")
    return jsonify({"comparison": text.strip()})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    if _client is None:
        print("No ANTHROPIC_API_KEY set — the app will run, but /api/compare will return 503.")
    # Flask's dev server only — production (Render) runs this via gunicorn instead,
    # which never executes this block. debug=True is opt-in for local work only.
    app.run(port=port, debug=os.environ.get("FLASK_DEBUG") == "1")

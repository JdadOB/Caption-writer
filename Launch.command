#!/bin/bash
# Caption Writer — double-click this file to launch the web dashboard.
# On first run it will install everything automatically (takes ~1 min).

# Always run from the folder this file lives in
cd "$(dirname "$0")"

VENV=".venv"

# ── Python check ──────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    osascript -e 'display alert "Python 3 not found" message "Download it from https://www.python.org/downloads/ then double-click Launch.command again." as critical'
    exit 1
fi

# ── Virtual environment ───────────────────────────────────────────────────────
if [[ ! -d "$VENV" ]]; then
    echo "Setting up environment for the first time (this takes about a minute)…"
    python3 -m venv "$VENV"
fi

source "$VENV/bin/activate"

# ── Dependencies ──────────────────────────────────────────────────────────────
MARKER="$VENV/.installed"
HASH=$(md5 -q requirements.txt 2>/dev/null || echo "none")

if [[ ! -f "$MARKER" || "$(cat "$MARKER")" != "$HASH" ]]; then
    echo "Installing dependencies…"
    pip install --quiet --upgrade pip
    pip install --quiet -r requirements.txt
    echo "$HASH" > "$MARKER"
    echo "Done."
fi

# ── API key ───────────────────────────────────────────────────────────────────
if [[ -f ".env" ]]; then
    set -a; source .env; set +a
fi

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
    KEY=$(osascript -e 'Tell application "System Events" to display dialog "Enter your Anthropic API key:" default answer "" with hidden answer' -e 'text returned of result' 2>/dev/null)
    if [[ -z "$KEY" ]]; then
        echo "No API key entered — exiting."
        exit 1
    fi
    echo "ANTHROPIC_API_KEY=$KEY" > .env
    export ANTHROPIC_API_KEY="$KEY"
    echo "API key saved to .env"
fi

# ── Launch ────────────────────────────────────────────────────────────────────
echo ""
echo "Opening Caption Writer at http://localhost:8501 …"
echo "(Close this window to stop the app)"
echo ""

# Open browser after a short delay so Streamlit has time to start
(sleep 3 && open "http://localhost:8501") &

streamlit run app.py --server.headless true

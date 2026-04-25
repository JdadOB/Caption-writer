#!/usr/bin/env bash
# Caption Writer launcher — sets up the environment on first run, then starts the app.
#
# Usage:
#   ./run.sh --app                             # launch the web dashboard  ← start here
#   ./run.sh                                   # CLI test with synthetic video
#   ./run.sh --client lifestyle_blogger        # CLI test with a different profile
#   ./run.sh --client tech_reviewer --frames 5
#   ./run.sh --video path/to/clip.mp4 --client fitness_creator   # real video (CLI)
#   ./run.sh --list-clients                    # show available profiles

set -euo pipefail

VENV_DIR=".venv"
REQUIREMENTS="requirements.txt"

# ── Colours ──────────────────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}▶${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✖${NC}  $*" >&2; }
heading() { echo -e "\n${BOLD}$*${NC}"; }

# ── Sanity checks ────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    error "python3 not found. Install Python 3.10+ and try again."
    exit 1
fi

PY_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')
if [[ $PY_MINOR -lt 10 ]]; then
    error "Python 3.10+ required (found 3.$PY_MINOR)."
    exit 1
fi

# ── Virtual environment ──────────────────────────────────────────────────────
if [[ ! -d "$VENV_DIR" ]]; then
    heading "Creating virtual environment…"
    python3 -m venv "$VENV_DIR"
    info "Virtual environment created at $VENV_DIR/"
fi

# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate"

# ── Dependencies ─────────────────────────────────────────────────────────────
INSTALLED_MARKER="$VENV_DIR/.deps_installed"
REQS_HASH=$(md5sum "$REQUIREMENTS" 2>/dev/null | cut -d' ' -f1 || echo "none")

if [[ ! -f "$INSTALLED_MARKER" ]] || [[ "$(cat "$INSTALLED_MARKER")" != "$REQS_HASH" ]]; then
    heading "Installing dependencies…"
    pip install --quiet --upgrade pip
    pip install --quiet -r "$REQUIREMENTS"
    echo "$REQS_HASH" > "$INSTALLED_MARKER"
    info "Dependencies installed."
fi

# ── API key check ─────────────────────────────────────────────────────────────
if [[ -f ".env" ]]; then
    # shellcheck source=/dev/null
    set -a; source .env; set +a
fi

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
    error "ANTHROPIC_API_KEY is not set."
    warn  "Create a .env file with:  ANTHROPIC_API_KEY=sk-ant-..."
    warn  "Or export it in your shell before running this script."
    exit 1
fi

# ── Argument routing ──────────────────────────────────────────────────────────
# --list-clients → delegate to main.py
for arg in "$@"; do
    if [[ "$arg" == "--list-clients" ]]; then
        python3 main.py --list-clients
        exit 0
    fi
done

# Parse --video / --client / --frames / --config-dir from our own flags,
# pass the rest through to the appropriate script.
VIDEO=""
CLIENT="fitness_creator"
FRAMES=3
CONFIG_DIR="config/clients"
KEEP_VIDEO=""
LAUNCH_APP=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --app)          LAUNCH_APP=1; shift ;;
        --video)        VIDEO="$2";      shift 2 ;;
        --client)       CLIENT="$2";     shift 2 ;;
        --frames)       FRAMES="$2";     shift 2 ;;
        --config-dir)   CONFIG_DIR="$2"; shift 2 ;;
        --keep-video)   KEEP_VIDEO="--keep-video"; shift ;;
        *)
            error "Unknown option: $1"
            echo ""
            echo "Usage: ./run.sh [--app]"
            echo "               [--client PROFILE] [--video FILE] [--frames N]"
            echo "               [--config-dir DIR] [--keep-video] [--list-clients]"
            exit 1
            ;;
    esac
done

# ── Launch ────────────────────────────────────────────────────────────────────
if [[ $LAUNCH_APP -eq 1 ]]; then
    heading "Starting web dashboard…"
    info "Opening at http://localhost:8501"
    exec streamlit run app.py
elif [[ -n "$VIDEO" ]]; then
    heading "Running caption generator on: $VIDEO"
    python3 main.py "$CLIENT" "$VIDEO" --frames "$FRAMES" --config-dir "$CONFIG_DIR"
else
    heading "Running CLI test with synthetic video (client: $CLIENT)"
    python3 test_run.py "$CLIENT" --frames "$FRAMES" --config-dir "$CONFIG_DIR" $KEEP_VIDEO
fi

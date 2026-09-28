#!/usr/bin/env bash
# After the morning paper lands: record Garden Radio from it, cure the jars, reindex search, print today's Crossword Times, reprint the kiosk.
set -u
N="$HOME/.hermes/garden/newsstand"; G="$HOME/.hermes/garden"; PY="$HOME/.hermes/hermes-agent/venv/bin/python"
cd "$N" && timeout 1200 "$PY" build_radio.py || true
/usr/bin/python3 "$N/build_jars.py"; /usr/bin/python3 "$N/build_search.py"
(cd "$G/crossword-times" && /usr/bin/python3 build_crossword.py)
(cd "$G/yearbook" && "$PY" build_yearbook.py >/dev/null)
cd "$N" && "$PY" build_newsstand.py
exit 0

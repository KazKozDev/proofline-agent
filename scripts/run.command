#!/usr/bin/env bash
# Double-clickable launcher for the project on macOS.
# It opens Terminal, installs dependencies (if needed), and starts Vite dev server.

# Ensure we run from the project directory (the directory of this script)
cd "$(dirname "$0")" || exit 1

# Load user shell profiles to ensure Node/NPM/NVM are available when launched from Finder
if [ -f "$HOME/.zprofile" ]; then
  source "$HOME/.zprofile"
fi
if [ -f "$HOME/.bash_profile" ]; then
  source "$HOME/.bash_profile"
fi
if [ -f "$HOME/.bashrc" ]; then
  source "$HOME/.bashrc"
fi
if [ -f "$HOME/.zshrc" ]; then
  source "$HOME/.zshrc"
fi

# Optional: use corepack if available (helps with pnpm/yarn if configured)
if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi

# Use npm via env to respect PATH from sourced profiles
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not available in PATH. Make sure Node.js is installed." >&2
  echo "You can install Node.js from https://nodejs.org/ or via nvm." >&2
  read -r -p "Press Enter to close..." _
  exit 1
fi

echo "Installing dependencies (this may take a moment the first time)..."
/usr/bin/env npm install

URL="http://localhost:5173/"

echo
echo "Starting the development server..."
/usr/bin/env npm run dev &
SERVER_PID=$!

echo "Waiting for the dev server to become available at $URL ..."
ATTEMPTS=60
for i in $(seq 1 $ATTEMPTS); do
  if command -v curl >/dev/null 2>&1 && curl -sSf "$URL" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

echo "Opening browser at $URL"
if command -v open >/dev/null 2>&1; then
  if [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
    open -na "Google Chrome" --args --new-window "$URL" || open "$URL"
  else
    open "$URL"
  fi
else
  echo "Note: 'open' command not found. Please open $URL manually in your browser."
fi

wait $SERVER_PID

# Keep window open if the command exits
status=$?
echo
if [ $status -ne 0 ]; then
  echo "The dev server exited with status $status"
fi
read -r -p "Press Enter to close this window..." _

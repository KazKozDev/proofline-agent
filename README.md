а

- Node.js (with npm)

## Setup

1. Create a `.env` file (or copy `.env.example`):
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and set your API key:
   ```env
   VITE_API_KEY=your_secret_key_here
   ```
   The app reads `VITE_API_KEY` via Vite (`import.meta.env.VITE_API_KEY`).

## Run Locally

You have two options:

1. Double-click from Finder:
   - Open the project folder in Finder.
   - Double-click `run.command`.
   - The script will install dependencies, start the dev server, and open `http://localhost:5173/` in your browser.

2. From Terminal:
   ```bash
   npm install
   npm run dev
   ```
   Then open: http://localhost:5173/

## Notes

- Environment files like `.env` are ignored by git; `.env.example` is tracked for reference.
- If the browser does not open automatically, you can visit `http://localhost:5173/` manually.
ввввв
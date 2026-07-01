# Budget Log — project instructions

Mobile-first static web app for quick budget entry, syncing to the owner's Google Sheet via a self-deployed Apps Script web app. Public repo; deployed by GitHub Pages from `main`.

## Architecture (mirror of workout-log)
- **No build step, no framework, no backend.** Plain HTML/CSS/JS: `index.html`, `styles/main.css`, `scripts/app.js`.
- **Data lives client-side** in `localStorage` (`budget-log:entries`, `budget-log:settings`). The repo must never contain personal financial data or the owner's Apps Script URL.
- **Sync**: POST batches of unsynced entries as `text/plain` JSON (avoids CORS preflight, which Apps Script can't answer) to the Apps Script URL configured in Settings. `appsscript.js` is the sheet-side endpoint (kept in repo for reference/setup, runs in Google's environment).
- Entry types map 1:1 to sheet tabs: spend → `Spend` (Date, Category, Item, Card, Price), income → `Income` (Date, Source, Income), invest → `Invest` (Date, Account, Amount). Dates ISO internally, `MM/DD/YYYY` at the sheet boundary (`isoToSheet`).

## Conventions
- Categories/cards/presets are constants at the top of `scripts/app.js` — keep them in sync with the owner's sheet categories.
- Mobile-first: test at ~390px width; keep tap targets ≥40px; safe-area insets are handled in CSS.
- Deleting an entry is local-only (never deletes sheet rows) — keep it that way; the sheet is append-only from this app.
- Dark mode via `prefers-color-scheme` and CSS custom properties in `:root`.

## Deploy
Push to `main` → GitHub Pages serves it. No CI, no secrets. Remember this repo is PUBLIC.

## Known next steps (not yet built)
- Service worker for true offline use
- Editable presets UI (currently hardcoded constants)
- Rent preset amount may need updating after the 2026-07-17 move settles

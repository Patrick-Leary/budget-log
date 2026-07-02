# Budget Log — project instructions

Mobile-first static web app for quick budget entry, syncing to a Google Sheet via a self-deployed Apps Script web app. Public repo; deployed by GitHub Pages from `main`.

## Architecture
- **No build step, no framework, no backend, no dependencies.** Plain HTML/CSS/JS: `index.html`, `styles/main.css`, `scripts/app.js`.
- **Data lives client-side** in `localStorage` (`budget-log:entries`, `budget-log:settings`, `budget-log:sheetCache`). The repo must never contain financial data, the Apps Script URL, or the sync secret.
- **Write path**: unsynced entries POST as `text/plain` JSON (avoids CORS preflight, which Apps Script can't answer) to the configured Apps Script URL. Entries carry ids; the script echoes back saved ids and the app marks them synced.
- **Read path**: `doGet` returns all transaction rows from the three tabs; the app caches them (`sheetCache`) for the Analysis tab. Analysis = sheet cache + local *unsynced* entries (synced ones are already in the sheet — don't double count).
- **Auth**: a shared secret (set in `appsscript.js`, entered in Settings) is required by both `doGet` and `doPost`.
- Entry types map 1:1 to sheet tabs: spend → `Spend` (Date, Category, Item, Card, Price), income → `Income` (Date, Source, Income), invest → `Invest` (Date, Account, Amount). Dates are ISO internally, `MM/DD/YYYY` at the sheet boundary (`isoToSheet`/`sheetToMonth`).
- `appsscript.js` is the sheet-side endpoint — kept in the repo for setup reference, runs only in Google's environment. Its reader keeps only rows whose first cell is a date, so header rows and pivot tables on the same tab are ignored.

## Conventions
- Categories/cards/presets are constants at the top of `scripts/app.js` — they mirror the owner's sheet categories; don't invent new ones without asking.
- Mobile-first: test at ~390px width; tap targets ≥40px; safe-area insets handled in CSS.
- Deleting an entry is local-only — the sheet is append-only from this app; keep it that way.
- Saving an income entry whose source matches /paycheck/i auto-appends a paired "401k + match" income row and a "401k" invest row for `K401_PER_PAYCHECK` (pairing keeps Saved = income − spend − invest unchanged). The amount is a hardcoded constant — update it manually when pay changes.
- Charts are hand-rolled divs/CSS — no chart libraries.
- Dark mode via `prefers-color-scheme` and CSS custom properties in `:root`.
- Scripts must never log or render the secret.

## Deploy
Push to `main` → GitHub Pages serves it. Changes to `appsscript.js` additionally require the owner to re-deploy in the Apps Script editor (Manage deployments → New version). Remember this repo is PUBLIC.

## Known next steps (not yet built)
- Service worker for true offline use
- Editable presets UI (currently hardcoded constants)

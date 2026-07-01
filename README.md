# 💸 Budget Log

A mobile-first quick-entry budget logger — log a purchase in seconds from your phone, and every entry syncs to your own Google Sheet. Static site, no backend, no account, no third-party data access. Sibling project to [workout-log](https://github.com/Patrick-Leary/workout-log), built on the same architecture.

**Live app:** https://patrick-leary.github.io/budget-log

> Your financial data never touches this repo or any server except your own Google Sheet. Entries are stored in your browser's `localStorage` and (optionally) pushed to a Google Apps Script endpoint that you deploy yourself.

## Why

Automated bank feeds can't split a mixed Costco cart, don't know a work-trip charge was reimbursed, and label things `ABC LIQUOR #42` instead of "Pregame materials." The judgment only exists in your head at the moment of purchase — so the fastest accurate system is a 10-second entry right then, not a review pass later.

## Features

- **Log tab** — amount, category chips, card chips, item, date (defaults to today)
- **Three entry types** — Spend / Income / Invest, matching the sheet's tabs
- **One-tap presets** — recurring entries (lunch, rent, utilities, insurance, paycheck, Roth) pre-fill the form
- **History** — entries grouped by day, current-month totals, delete (local)
- **Google Sheets sync** — entries push on save; failed syncs queue and retry via "Sync now" (amber dot = not yet synced)
- **Export / Import JSON** — backup or move data between devices
- **Dark mode** — follows system preference
- **Installable** — add to home screen on iOS/Android for an app-like experience

## Sheet setup

The app appends rows to three tabs (rename in `appsscript.js` if yours differ):

| Tab | Columns |
|---|---|
| `Spend` | Date, Category, Item, Card, Price |
| `Income` | Date, Source, Income |
| `Invest` | Date, Account, Amount |

Dates are written as `MM/DD/YYYY`.

### Deploy the Apps Script

1. Open your budget spreadsheet → **Extensions → Apps Script**
2. Paste the contents of [`appsscript.js`](appsscript.js), save
3. **Deploy → New deployment → Web app** — Execute as: **Me**, Who has access: **Anyone**
4. Copy the `/exec` URL into the app's **Settings** tab

The URL is stored in your browser's localStorage only — it is never committed to this repo.

## Development

No build step. Open `index.html` in a browser, or serve the folder with any static server. Deployed automatically via GitHub Pages from `main`.

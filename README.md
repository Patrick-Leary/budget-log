# Budget Log

Mobile quick-entry budget tracker. Log Spend / Income / Invest entries from your phone; everything syncs to a Google Sheet you own via a Google Apps Script you deploy yourself. Static site — no backend, no account, no data stored anywhere except your browser and your sheet.

**Live app:** https://patrick-leary.github.io/budget-log

## Setup

### 1. Prepare the sheet

Your spreadsheet needs three tabs with these columns (row 1 = headers):

| Tab | Columns |
|---|---|
| `Spend` | Date, Category, Item, Card, Price |
| `Income` | Date, Source, Income |
| `Invest` | Date, Account, Amount |

Different tab names? Edit `TABS` at the top of `appsscript.js`.

### 2. Deploy the Apps Script

1. Open the spreadsheet → **Extensions → Apps Script**
2. Delete any default code, paste in the contents of [`appsscript.js`](appsscript.js)
3. Set `SECRET` at the top to a long random string (this is your password — save it in a password manager)
4. **Deploy → New deployment → Web app**, with **Execute as: Me** and **Who has access: Anyone**
5. Authorize when prompted, then copy the `/exec` URL

> Re-deploying after script changes: **Deploy → Manage deployments → edit → New version**. The URL stays the same.

### 3. Configure the app

1. Open the live app → **Settings**
2. Paste the web app URL and the secret → **Save**
3. Tap **Sync now** to test — then check the **Analysis** tab, which pulls your sheet history

### 4. Install on your phone

Open the app in Safari/Chrome → Share → **Add to Home Screen**.

## How syncing works

- Saving an entry stores it locally and pushes it to the sheet immediately. If the push fails (offline, etc.), the entry keeps an amber dot and retries on the next save or **Sync now**.
- The Analysis tab reads the whole sheet (plus any unsynced local entries), so history you entered before using this app is included.
- Deleting an entry in History is local-only — rows already written to the sheet are never touched. Fix mistakes in the sheet itself.
- Dates are written as `MM/DD/YYYY`.

## Security notes

- The web app URL + secret together are the only key to your data. Don't share them, don't commit them — the app keeps both in your browser's `localStorage` only.
- Read (`doGet`) and write (`doPost`) both require the secret.
- The Apps Script runs as you and only touches the one spreadsheet it's bound to.

## Development

No build step. Open `index.html` in a browser or serve the folder with any static server. Pushing to `main` deploys via GitHub Pages.

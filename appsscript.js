/**
 * Budget Log — Google Sheets endpoint (write + read).
 * See README.md for deployment steps.
 *
 * SECURITY: set SECRET to a long random string, and enter the same
 * value in the app's Settings tab. All requests (read and write) are
 * rejected without it. Leave '' only while testing.
 */

const SECRET = '';

const TABS = {
  spend: 'Spend',
  income: 'Income',
  invest: 'Invest',
};

// ---------- Write ----------

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (!checkSecret(data.secret)) return jsonOut({ ok: false, error: 'unauthorized' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const saved = [];

    (data.entries || []).forEach(function (entry) {
      const sheet = ss.getSheetByName(TABS[entry.type]);
      if (!sheet) throw new Error('Missing tab: ' + TABS[entry.type]);

      if (entry.type === 'spend') {
        sheet.appendRow([entry.date, entry.category, entry.item, entry.card, entry.price]);
      } else if (entry.type === 'income') {
        sheet.appendRow([entry.date, entry.source, entry.income]);
      } else if (entry.type === 'invest') {
        sheet.appendRow([entry.date, entry.account, entry.amount]);
      } else {
        throw new Error('Unknown entry type: ' + entry.type);
      }
      saved.push(entry.id);
    });

    return jsonOut({ ok: true, saved: saved });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------- Read ----------

function doGet(e) {
  try {
    if (!checkSecret(e.parameter.secret)) return jsonOut({ ok: false, error: 'unauthorized' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return jsonOut({
      ok: true,
      spend: readTab(ss, TABS.spend, 5),
      income: readTab(ss, TABS.income, 3),
      invest: readTab(ss, TABS.invest, 3),
    });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

/**
 * Read the first `cols` columns of a tab, keeping only rows whose first
 * cell is a date. Header rows, pivot tables, and blank rows fall out.
 */
function readTab(ss, name, cols) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  const tz = Session.getScriptTimeZone();
  const out = [];

  values.forEach(function (row) {
    const first = row[0];
    let date = null;
    if (first instanceof Date) {
      date = Utilities.formatDate(first, tz, 'MM/dd/yyyy');
    } else if (typeof first === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(first.trim())) {
      date = first.trim();
    }
    if (!date) return;
    const rest = row.slice(1, cols).map(function (v) {
      return v instanceof Date ? Utilities.formatDate(v, tz, 'MM/dd/yyyy') : v;
    });
    out.push([date].concat(rest));
  });

  return out;
}

// ---------- Helpers ----------

function checkSecret(provided) {
  if (SECRET === '') return true; // testing mode
  return provided === SECRET;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

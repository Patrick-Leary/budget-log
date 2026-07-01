/**
 * Budget Log — Google Sheets sync endpoint.
 *
 * Setup: open your budget spreadsheet -> Extensions -> Apps Script,
 * paste this file, save, then Deploy -> New deployment -> Web app
 * (Execute as: Me, Who has access: Anyone). Paste the /exec URL into
 * Budget Log's Settings tab.
 *
 * Tab names must match your spreadsheet's transaction tabs.
 */

const TABS = {
  spend: 'Spend',
  income: 'Income',
  invest: 'Invest',
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
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

function doGet() {
  return jsonOut({ ok: true, service: 'budget-log' });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

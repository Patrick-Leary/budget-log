// ---------- Constants ----------

const CATEGORIES = [
  'Restaurant', 'RV Food', 'Groceries', 'Gas', 'Drinks and Nightlife',
  'Entertainment', 'Home Goods', 'Health', 'Personal Care', 'Transportation',
  'Tech', 'Travel', 'Clothing', 'Gifts', 'Rent', 'Utilities',
  'Car Insurance', 'Room Decor', 'Other Housing Payments', 'Other',
];

const CARDS = ['Bilt', 'Discover', 'SoFi', 'Autograph', 'CSP'];
const SOURCES = ['Paycheck'];
const ACCOUNTS = ['Roth IRA'];

const PRESETS = [
  { label: '🍱 RV Lunch $6', type: 'spend', category: 'RV Food', item: 'RV Lunch', card: 'Bilt', amount: 6 },
  { label: '🏠 Rent', type: 'spend', category: 'Rent', item: 'Rent', card: 'Bilt', amount: 1624 },
  { label: '💡 Utilities', type: 'spend', category: 'Utilities', item: 'Utilities', card: 'Bilt', amount: null },
  { label: '🚗 Geico', type: 'spend', category: 'Car Insurance', item: 'Geico', card: 'Bilt', amount: 109.84 },
  { label: '💰 Paycheck', type: 'income', source: 'Paycheck', amount: 2276.00 },
  { label: '📈 Roth $625', type: 'invest', account: 'Roth IRA', amount: 625 },
];

const STORE_ENTRIES = 'budget-log:entries';
const STORE_SETTINGS = 'budget-log:settings';
const STORE_SHEET = 'budget-log:sheetCache';

// ---------- State ----------

let entries = JSON.parse(localStorage.getItem(STORE_ENTRIES) || '[]');
let settings = JSON.parse(localStorage.getItem(STORE_SETTINGS) || '{}');
let sheetCache = JSON.parse(localStorage.getItem(STORE_SHEET) || 'null');
let currentType = 'spend';
let selectedCategory = null;
let selectedCard = null;

// ---------- Helpers ----------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function saveEntries() { localStorage.setItem(STORE_ENTRIES, JSON.stringify(entries)); }
function saveSettings() { localStorage.setItem(STORE_SETTINGS, JSON.stringify(settings)); }
function saveSheetCache() { localStorage.setItem(STORE_SHEET, JSON.stringify(sheetCache)); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ISO (YYYY-MM-DD) -> sheet format (MM/DD/YYYY)
function isoToSheet(iso) {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

// sheet format (MM/DD/YYYY) -> month key (YYYY-MM)
function sheetToMonth(mdy) {
  const [m, , y] = mdy.split('/');
  return `${y}-${m.padStart(2, '0')}`;
}

function parseMoney(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[$,]/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmtMoney(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- Rendering: chips & presets ----------

function renderChips(containerId, values, onSelect, getSelected) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  values.forEach((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (getSelected() === v ? ' selected' : '');
    b.textContent = v;
    b.onclick = () => { onSelect(v); renderAllChips(); };
    el.appendChild(b);
  });
}

function renderAllChips() {
  renderChips('category-chips', CATEGORIES, (v) => (selectedCategory = v), () => selectedCategory);
  renderChips('card-chips', CARDS, (v) => (selectedCard = v), () => selectedCard);
  renderChips('source-chips', SOURCES, (v) => ($('#source').value = v), () => $('#source').value);
  renderChips('account-chips', ACCOUNTS, (v) => ($('#account').value = v), () => $('#account').value);
}

function renderPresets() {
  const el = $('#presets');
  el.innerHTML = '';
  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.label;
    b.onclick = () => applyPreset(p);
    el.appendChild(b);
  });
}

function applyPreset(p) {
  setType(p.type);
  if (p.amount != null) $('#amount').value = p.amount;
  else { $('#amount').value = ''; $('#amount').focus(); }
  if (p.type === 'spend') {
    selectedCategory = p.category;
    selectedCard = p.card;
    $('#item').value = p.item;
  } else if (p.type === 'income') {
    $('#source').value = p.source;
  } else if (p.type === 'invest') {
    $('#account').value = p.account;
  }
  renderAllChips();
}

// ---------- Type toggle ----------

function setType(type) {
  currentType = type;
  $$('#type-toggle button').forEach((b) => b.classList.toggle('active', b.dataset.type === type));
  $$('.spend-only').forEach((el) => el.classList.toggle('hidden', type !== 'spend'));
  $$('.income-only').forEach((el) => el.classList.toggle('hidden', type !== 'income'));
  $$('.invest-only').forEach((el) => el.classList.toggle('hidden', type !== 'invest'));
}

// ---------- Save entry ----------

function handleSubmit(e) {
  e.preventDefault();
  const amount = parseFloat($('#amount').value);
  const date = $('#date').value;
  if (!amount || !date) return toast('Amount and date required');

  const entry = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    type: currentType,
    date,
    savedAt: new Date().toISOString(),
    synced: false,
  };

  if (currentType === 'spend') {
    if (!selectedCategory) return toast('Pick a category');
    if (!selectedCard) return toast('Pick a card');
    entry.category = selectedCategory;
    entry.item = $('#item').value.trim() || selectedCategory;
    entry.card = selectedCard;
    entry.price = amount;
  } else if (currentType === 'income') {
    entry.source = $('#source').value.trim() || 'Income';
    entry.income = amount;
  } else {
    entry.account = $('#account').value.trim() || 'Roth IRA';
    entry.amount = amount;
  }

  entries.push(entry);
  saveEntries();
  resetForm();
  toast('Saved ✓');
  renderHistory();
  syncUnsynced(true); // fire-and-forget
}

function resetForm() {
  $('#amount').value = '';
  $('#item').value = '';
  $('#date').value = todayISO();
  selectedCategory = null;
  selectedCard = null;
  renderAllChips();
}

// ---------- History ----------

function entryTitle(e) {
  if (e.type === 'spend') return e.item;
  if (e.type === 'income') return e.source;
  return e.account;
}

function entryAmount(e) {
  return e.type === 'spend' ? e.price : e.type === 'income' ? e.income : e.amount;
}

function renderHistory() {
  const list = $('#history-list');
  list.innerHTML = '';

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1) || (a.savedAt < b.savedAt ? 1 : -1));

  const monthPrefix = todayISO().slice(0, 7);
  const monthEntries = entries.filter((e) => e.date.startsWith(monthPrefix));
  const spent = monthEntries.filter((e) => e.type === 'spend').reduce((s, e) => s + e.price, 0);
  const earned = monthEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.income, 0);
  const invested = monthEntries.filter((e) => e.type === 'invest').reduce((s, e) => s + e.amount, 0);
  $('#month-summary').innerHTML =
    `<div>Spent<strong>${fmtMoney(spent)}</strong></div>` +
    `<div>Income<strong>${fmtMoney(earned)}</strong></div>` +
    `<div>Invested<strong>${fmtMoney(invested)}</strong></div>`;

  let currentDay = null;
  let dayContainer = null;
  sorted.forEach((e) => {
    if (e.date !== currentDay) {
      currentDay = e.date;
      dayContainer = document.createElement('div');
      dayContainer.className = 'day-group';
      dayContainer.innerHTML = `<div class="day-label">${isoToSheet(e.date)}</div>`;
      list.appendChild(dayContainer);
    }
    const row = document.createElement('div');
    row.className = 'entry';
    const meta = e.type === 'spend' ? `${e.category} · ${e.card}` : e.type;
    row.innerHTML =
      (e.synced ? '' : '<span class="unsynced-dot" title="Not synced"></span>') +
      `<div class="info"><div class="title">${entryTitle(e)}</div><div class="meta">${meta}</div></div>` +
      `<div class="amt ${e.type !== 'spend' ? 'income' : ''}">${e.type === 'spend' ? '−' : '+'}${fmtMoney(entryAmount(e))}</div>`;
    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '✕';
    del.onclick = () => {
      if (!confirm('Delete this entry? (Local only — already-synced rows stay in the sheet.)')) return;
      entries = entries.filter((x) => x.id !== e.id);
      saveEntries();
      renderHistory();
    };
    row.appendChild(del);
    dayContainer.appendChild(row);
  });

  updateSyncStatus();
}

// ---------- Sync (write) ----------

function unsyncedEntries() { return entries.filter((e) => !e.synced); }

function updateSyncStatus() {
  const n = unsyncedEntries().length;
  $('#sync-status').textContent = settings.scriptUrl
    ? (n ? `${n} entr${n === 1 ? 'y' : 'ies'} waiting to sync.` : 'All entries synced ✓')
    : 'No Apps Script URL configured — entries stay on this device.';
}

function toSheetEntry(e) {
  const base = { id: e.id, type: e.type, date: isoToSheet(e.date) };
  if (e.type === 'spend') return { ...base, category: e.category, item: e.item, card: e.card, price: e.price };
  if (e.type === 'income') return { ...base, source: e.source, income: e.income };
  return { ...base, account: e.account, amount: e.amount };
}

async function syncUnsynced(quiet) {
  if (!settings.scriptUrl) { if (!quiet) toast('Set the Apps Script URL first'); return; }
  const batch = unsyncedEntries();
  if (!batch.length) { if (!quiet) toast('Nothing to sync'); return; }
  try {
    // text/plain avoids a CORS preflight, which Apps Script can't answer
    const res = await fetch(settings.scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ secret: settings.secret || '', entries: batch.map(toSheetEntry) }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'sync failed');
    const savedIds = new Set(data.saved);
    entries.forEach((e) => { if (savedIds.has(e.id)) e.synced = true; });
    saveEntries();
    if (!quiet) toast(`Synced ${data.saved.length} ✓`);
    refreshSheetData(true); // keep analysis current
  } catch (err) {
    if (!quiet) toast('Sync failed — kept locally');
  }
  renderHistory();
}

// ---------- Sheet data (read) ----------

async function refreshSheetData(quiet) {
  if (!settings.scriptUrl) { if (!quiet) toast('Set the Apps Script URL first'); return; }
  try {
    const url = settings.scriptUrl + '?secret=' + encodeURIComponent(settings.secret || '');
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'fetch failed');
    sheetCache = {
      fetchedAt: new Date().toISOString(),
      spend: data.spend,
      income: data.income,
      invest: data.invest,
    };
    saveSheetCache();
    if (!quiet) toast('Data refreshed ✓');
  } catch (err) {
    if (!quiet) toast('Refresh failed — ' + (err.message === 'unauthorized' ? 'wrong secret?' : 'check URL'));
  }
  renderAnalysis();
}

/**
 * Rows for analysis: everything from the sheet cache, plus local entries
 * not yet synced (synced ones are already in the sheet).
 * Normalized shape: { month, type, category, amount }
 */
function analysisRows() {
  const rows = [];
  if (sheetCache) {
    sheetCache.spend.forEach(([date, category, , , price]) =>
      rows.push({ month: sheetToMonth(date), type: 'spend', category, amount: parseMoney(price) }));
    sheetCache.income.forEach(([date, , income]) =>
      rows.push({ month: sheetToMonth(date), type: 'income', category: 'Income', amount: parseMoney(income) }));
    sheetCache.invest.forEach(([date, , amount]) =>
      rows.push({ month: sheetToMonth(date), type: 'invest', category: 'Invest', amount: parseMoney(amount) }));
  }
  unsyncedEntries().forEach((e) =>
    rows.push({
      month: e.date.slice(0, 7),
      type: e.type,
      category: e.type === 'spend' ? e.category : e.type === 'income' ? 'Income' : 'Invest',
      amount: entryAmount(e),
    }));
  return rows;
}

// ---------- Analysis ----------

function renderAnalysis() {
  const rows = analysisRows();
  const hasData = rows.length > 0;
  $('#analysis-empty').classList.toggle('hidden', hasData);
  $('#analysis-content').classList.toggle('hidden', !hasData);
  if (!hasData) return;

  // Monthly rollup
  const months = {};
  rows.forEach((r) => {
    const m = (months[r.month] ||= { income: 0, spend: 0, invest: 0 });
    m[r.type] += r.amount;
  });
  const keys = Object.keys(months).sort();

  // Stat cards: current month
  const nowKey = todayISO().slice(0, 7);
  const cur = months[nowKey] || { income: 0, spend: 0, invest: 0 };
  const saved = cur.income - cur.spend - cur.invest;
  const rate = cur.income > 0 ? ((cur.income - cur.spend) / cur.income) * 100 : 0;
  $('#stat-cards').innerHTML =
    `<div class="stat-card"><span>Saved (${monthLabel(nowKey)})</span><strong class="${saved < 0 ? 'neg' : ''}">${fmtMoney(saved)}</strong></div>` +
    `<div class="stat-card"><span>Savings rate</span><strong>${rate.toFixed(0)}%</strong></div>`;

  // Trend chart: last 6 months
  const last6 = keys.slice(-6);
  const max = Math.max(...last6.flatMap((k) => [months[k].income, months[k].spend, months[k].invest]), 1);
  const chart = $('#trend-chart');
  chart.innerHTML = '';
  last6.forEach((k) => {
    const m = months[k];
    const col = document.createElement('div');
    col.className = 'trend-col';
    col.innerHTML =
      `<div class="bars">` +
      `<div class="bar income-bar" style="height:${(m.income / max) * 100}%" title="Income ${fmtMoney(m.income)}"></div>` +
      `<div class="bar spend-bar" style="height:${(m.spend / max) * 100}%" title="Spend ${fmtMoney(m.spend)}"></div>` +
      `<div class="bar invest-bar" style="height:${(m.invest / max) * 100}%" title="Invest ${fmtMoney(m.invest)}"></div>` +
      `</div><div class="trend-label">${monthLabel(k)}</div>`;
    chart.appendChild(col);
  });

  // Month selector for category breakdown
  const sel = $('#month-select');
  const prev = sel.value;
  sel.innerHTML = '';
  [...keys].reverse().forEach((k) => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = monthLabel(k);
    sel.appendChild(opt);
  });
  sel.value = keys.includes(prev) ? prev : (keys.includes(nowKey) ? nowKey : keys[keys.length - 1]);
  renderBreakdown(rows, sel.value);

  const fetched = sheetCache && sheetCache.fetchedAt;
  $('#last-fetched').textContent = fetched
    ? 'Sheet data from ' + new Date(fetched).toLocaleString()
    : 'Local entries only — refresh to pull the sheet.';
}

function renderBreakdown(rows, monthKey) {
  const spendRows = rows.filter((r) => r.type === 'spend' && r.month === monthKey);
  const byCat = {};
  spendRows.forEach((r) => (byCat[r.category] = (byCat[r.category] || 0) + r.amount));
  const total = Object.values(byCat).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const el = $('#category-breakdown');
  el.innerHTML = sorted.length ? '' : '<p class="hint">No spending logged this month.</p>';
  sorted.forEach(([cat, amt]) => {
    const pct = total > 0 ? (amt / total) * 100 : 0;
    const row = document.createElement('div');
    row.className = 'cat-row';
    row.innerHTML =
      `<div class="cat-head"><span>${cat}</span><span>${fmtMoney(amt)} · ${pct.toFixed(0)}%</span></div>` +
      `<div class="cat-track"><div class="cat-fill" style="width:${pct}%"></div></div>`;
    el.appendChild(row);
  });
}

// ---------- Export / import ----------

function exportJSON() {
  const blob = new Blob([JSON.stringify({ entries, settings }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `budget-log-${todayISO()}.json`;
  a.click();
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.entries)) throw new Error('bad file');
      const known = new Set(entries.map((e) => e.id));
      const added = data.entries.filter((e) => !known.has(e.id));
      entries = entries.concat(added);
      saveEntries();
      renderHistory();
      toast(`Imported ${added.length} entries`);
    } catch {
      toast('Import failed — not a Budget Log export');
    }
  };
  reader.readAsText(file);
}

// ---------- Init ----------

function init() {
  $('#date').value = todayISO();
  renderPresets();
  renderAllChips();
  renderHistory();
  renderAnalysis();

  $('#entry-form').addEventListener('submit', handleSubmit);

  $$('#type-toggle button').forEach((b) =>
    b.addEventListener('click', () => setType(b.dataset.type))
  );

  $$('.tabbar button').forEach((b) =>
    b.addEventListener('click', () => {
      $$('.tabbar button').forEach((x) => x.classList.toggle('active', x === b));
      $$('.view').forEach((v) => v.classList.remove('active'));
      $(`#view-${b.dataset.view}`).classList.add('active');
      if (b.dataset.view === 'history') renderHistory();
      if (b.dataset.view === 'analysis') renderAnalysis();
    })
  );

  $('#script-url').value = settings.scriptUrl || '';
  $('#script-secret').value = settings.secret || '';
  $('#save-sync').addEventListener('click', () => {
    settings.scriptUrl = $('#script-url').value.trim();
    settings.secret = $('#script-secret').value.trim();
    saveSettings();
    updateSyncStatus();
    if (settings.scriptUrl) refreshSheetData(false); // doubles as a connection test
    else toast('Sync settings saved');
  });
  $('#sync-now').addEventListener('click', () => syncUnsynced(false));
  $('#refresh-data').addEventListener('click', () => refreshSheetData(false));
  $('#month-select').addEventListener('change', (e) => renderBreakdown(analysisRows(), e.target.value));

  $('#export-json').addEventListener('click', exportJSON);
  $('#import-json').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  });

  // Pull fresh sheet data on load if sync is configured
  if (settings.scriptUrl) refreshSheetData(true);
}

init();

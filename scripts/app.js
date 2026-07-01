// ---------- Constants ----------

const CATEGORIES = [
  'Restaurant', 'RV Food', 'Groceries', 'Gas', 'Drinks and Nightlife',
  'Entertainment', 'Home Goods', 'Health', 'Personal Care', 'Transportation',
  'Tech', 'Travel', 'Clothing', 'Gifts', 'Rent', 'Utilities',
  'Car Insurance', 'Room Decor', 'Other Housing Payments', 'Other',
];

const CARDS = ['Bilt', 'Discover', 'SoFi', 'Autograph'];
const SOURCES = ['Paycheck', 'Payback', 'Poker', 'Tax Return'];
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

// ---------- State ----------

let entries = JSON.parse(localStorage.getItem(STORE_ENTRIES) || '[]');
let settings = JSON.parse(localStorage.getItem(STORE_SETTINGS) || '{}');
let currentType = 'spend';
let selectedCategory = null;
let selectedCard = null;

// ---------- Helpers ----------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function saveEntries() { localStorage.setItem(STORE_ENTRIES, JSON.stringify(entries)); }
function saveSettings() { localStorage.setItem(STORE_SETTINGS, JSON.stringify(settings)); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ISO (YYYY-MM-DD) -> sheet format (MM/DD/YYYY)
function isoToSheet(iso) {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

function fmtMoney(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
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

  // Month summary (current month, local entries only)
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

// ---------- Sync ----------

function unsyncedEntries() { return entries.filter((e) => !e.synced); }

function updateSyncStatus() {
  const n = unsyncedEntries().length;
  $('#sync-status').textContent = settings.scriptUrl
    ? (n ? `${n} entr${n === 1 ? 'y' : 'ies'} waiting to sync.` : 'All entries synced ✓')
    : 'No Apps Script URL configured — entries stay on this device.';
}

// Sheet-facing payload (dates converted to MM/DD/YYYY)
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
      body: JSON.stringify({ entries: batch.map(toSheetEntry) }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'sync failed');
    const savedIds = new Set(data.saved);
    entries.forEach((e) => { if (savedIds.has(e.id)) e.synced = true; });
    saveEntries();
    if (!quiet) toast(`Synced ${data.saved.length} ✓`);
  } catch (err) {
    if (!quiet) toast('Sync failed — kept locally');
  }
  renderHistory();
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
    })
  );

  $('#script-url').value = settings.scriptUrl || '';
  $('#save-url').addEventListener('click', () => {
    settings.scriptUrl = $('#script-url').value.trim();
    saveSettings();
    updateSyncStatus();
    toast('URL saved');
  });
  $('#sync-now').addEventListener('click', () => syncUnsynced(false));

  $('#export-json').addEventListener('click', exportJSON);
  $('#import-json').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  });
}

init();

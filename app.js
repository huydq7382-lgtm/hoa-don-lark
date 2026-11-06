// Hoá đơn dịch vụ — giao diện. Không biết gì về Lark: mọi đọc/ghi đi qua "api" (data-lark.js hoặc data-demo.js).

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const fmt = (n) => (n == null || n === '' || Number.isNaN(n) ? '' : Math.round(n).toLocaleString('vi-VN'));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
const digits = (s) => String(s || '').replace(/\D/g, '');

const N_LINES = 7, N_WED = 4, DRAFT_KEY = 'hoadon21.draft.v1';
let api, data;
const state = { mode: 'new', recordId: null, before: null, newCust: false, nLines: 2, nWed: 1, showInAn: false, busy: false, pendingSel: null };

// ---------- đọc số thành chữ ----------
const DIG = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
function read3(n, full) {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10, w = [];
  if (h > 0 || full) w.push(DIG[h], 'trăm');
  if (t > 1) {
    w.push(DIG[t], 'mươi');
    if (u === 1) w.push('mốt'); else if (u === 4) w.push('tư'); else if (u === 5) w.push('lăm'); else if (u > 0) w.push(DIG[u]);
  } else if (t === 1) {
    w.push('mười'); if (u === 5) w.push('lăm'); else if (u > 0) w.push(DIG[u]);
  } else if (u > 0) {
    if (h > 0 || full) w.push('lẻ');
    w.push(DIG[u]);
  }
  return w.join(' ');
}
function toWords(amount) {
  let n = Math.round(Math.abs(amount || 0));
  if (!n) return '';
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const groups = [];
  while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
  const parts = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (!groups[i]) continue;
    parts.push(read3(groups[i], i < groups.length - 1), units[i]);
  }
  const s = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return (amount < 0 ? 'Âm ' + s : s.charAt(0).toUpperCase() + s.slice(1)) + ' đồng.';
}

// ---------- ngày giờ ----------
function toInput(ts, withTime) {
  if (ts == null) return '';
  const d = new Date(ts);
  const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${s}T${pad(d.getHours())}:${pad(d.getMinutes())}` : s;
}
function fromInput(v) {
  if (!v) return null;
  const [d, t = '00:00'] = v.split('T');
  const [y, m, dd] = d.split('-').map(Number);
  const [hh, mi] = t.split(':').map(Number);
  return new Date(y, m - 1, dd, hh || 0, mi || 0).getTime();
}

// ---------- ô tiền ----------
function bindMoney(input) {
  input.addEventListener('input', () => {
    const d = digits(input.value);
    input.value = d ? fmt(Number(d)) : '';
    input.dataset.touched = '1';
  });
}
const getMoney = (input) => { const d = digits(input.value); return d ? Number(d) : null; };
const setMoney = (input, n) => { input.value = n == null ? '' : fmt(n); };

// ---------- combobox tìm kiếm (gõ không dấu vẫn ra) ----------
function makeCombo(host, { placeholder = '', source, key, sub, group, extra, onPick }) {
  host.classList.add('combo');
  const input = document.createElement('input');
  input.className = 'ink fill';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = placeholder;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  const list = document.createElement('div');
  list.className = 'combo-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  host.append(input, list);

  let picked = null, shown = [], active = -1;
  const hay = (it) => norm(key(it) + ' ' + (extra ? extra(it) : ''));

  function search(q) {
    const items = source();
    const n = norm(q);
    if (!n) return items.slice(0, 300);
    const toks = n.split(' ');
    const qd = digits(q);
    const hits = items.filter((it) => {
      const h = hay(it);
      return toks.every((t) => h.includes(t)) || (qd.length >= 3 && extra && digits(extra(it)).includes(qd));
    });
    hits.sort((a, b) => (norm(key(b)).startsWith(n) ? 1 : 0) - (norm(key(a)).startsWith(n) ? 1 : 0));
    return hits.slice(0, 80);
  }
  function render() {
    list.textContent = '';
    if (!shown.length) {
      const e = document.createElement('div'); e.className = 'combo-empty'; e.textContent = 'Không thấy trong danh sách';
      list.append(e); return;
    }
    let lastGroup = null;
    const grouped = group && !norm(input.value);
    shown.forEach((it, i) => {
      if (grouped) {
        const g = group(it) || 'Khác';
        if (g !== lastGroup) { const gh = document.createElement('div'); gh.className = 'combo-group'; gh.textContent = g; list.append(gh); lastGroup = g; }
      }
      const row = document.createElement('div');
      row.className = 'combo-item' + (i === active ? ' active' : '');
      row.setAttribute('role', 'option');
      const a = document.createElement('span'); a.textContent = key(it);
      const b = document.createElement('span'); b.className = 'sub'; b.textContent = sub ? sub(it) || '' : '';
      row.append(a, b);
      row.addEventListener('mousedown', (ev) => { ev.preventDefault(); choose(it); });
      list.append(row);
    });
    const el = list.querySelectorAll('.combo-item')[active];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
  function open() {
    shown = search(input.value);
    if (group && !norm(input.value)) shown.sort((a, b) => (group(a) || '').localeCompare(group(b) || '', 'vi'));
    active = shown.length && norm(input.value) ? 0 : -1;
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); render();
  }
  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); }
  function choose(it) {
    picked = it; input.value = it ? key(it) : ''; host.classList.remove('invalid'); close();
    onPick && onPick(it);
  }
  input.addEventListener('focus', open);
  input.addEventListener('input', () => {
    host.classList.remove('invalid');
    if (picked && input.value !== key(picked)) { picked = null; onPick && onPick(null, { typing: true }); }
    open();
  });
  input.addEventListener('keydown', (e) => {
    if (list.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { open(); e.preventDefault(); return; }
    if (e.key === 'ArrowDown') { active = Math.min(shown.length - 1, active + 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); render(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (!list.hidden && shown[active]) { choose(shown[active]); e.preventDefault(); } }
    else if (e.key === 'Escape') close();
  });
  input.addEventListener('blur', () => {
    setTimeout(close, 120);
    const v = input.value.trim();
    if (!v) { if (picked) { picked = null; onPick && onPick(null); } return; }
    if (!picked) {
      const exact = source().find((it) => norm(key(it)) === norm(v));
      if (exact) choose(exact); else host.classList.add('invalid');
    }
  });
  return {
    input,
    get value() { return picked; },
    get text() { return input.value.trim(); },
    set(it) { picked = it || null; input.value = it ? key(it) : ''; host.classList.remove('invalid'); },
    setByKey(k) {
      if (!k) return this.set(null);
      const it = source().find((x) => key(x) === k) || source().find((x) => norm(key(x)) === norm(k));
      if (it) this.set(it); else { picked = null; input.value = k; host.classList.add('invalid'); }
    },
    invalid() { return !!input.value.trim() && !picked; },
    mark(bad) { host.classList.toggle('invalid', !!bad); },
  };
}

// ---------- dựng các dòng ----------
const lines = [];
const weds = [];
let custCombo, inAnCombo;
let pickedCust = null;

function buildLines() {
  const tb = $('lines');
  for (let i = 0; i < N_LINES; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="stt"></td><td><div class="lineName">${i === 0 ? '<span class="tag main">chính</span>' : ''}<div class="grow"></div></div></td>`
      + `<td class="money"><input class="ink fill money-in" inputmode="numeric" autocomplete="off" aria-label="Thành tiền dòng ${i + 1}"></td>`
      + `<td class="noprint">${i > 0 ? `<button type="button" class="x" aria-label="Xoá dòng">×</button>` : ''}</td>`;
    tb.append(tr);
    const price = tr.querySelector('.money-in');
    bindMoney(price);
    const line = { tr, price, combo: null };
    line.combo = makeCombo(tr.querySelector('.grow'), {
      placeholder: i === 0 ? 'chọn sản phẩm / gói chính' : 'chọn dịch vụ thêm',
      source: () => data.products,
      key: (p) => p.name,
      sub: (p) => (p.price != null ? fmt(p.price) : ''),
      group: (p) => p.cat,
      onPick: (p, o) => {
        if (o && o.typing) return;
        if (p && p.price != null && (!price.dataset.touched || getMoney(price) == null)) { setMoney(price, p.price); delete price.dataset.touched; }
        changed();
      },
    });
    const x = tr.querySelector('.x');
    if (x) x.addEventListener('click', () => removeLine(i));
    lines.push(line);
  }
}
function removeLine(i) {
  for (let j = i; j < N_LINES - 1; j++) {
    lines[j].combo.set(lines[j + 1].combo.value);
    if (!lines[j].combo.value && lines[j + 1].combo.text) lines[j].combo.setByKey(lines[j + 1].combo.text);
    lines[j].price.value = lines[j + 1].price.value;
    if (lines[j + 1].price.dataset.touched) lines[j].price.dataset.touched = '1'; else delete lines[j].price.dataset.touched;
  }
  lines[N_LINES - 1].combo.set(null); lines[N_LINES - 1].price.value = '';
  state.nLines = Math.max(1, state.nLines - 1);
  layout(); changed();
}

function buildWeddings() {
  const box = $('weddings');
  for (let i = 0; i < N_WED; i++) {
    const row = document.createElement('div');
    row.className = 'wed';
    row.innerHTML = `<span class="pair"><label class="lbl" for="wedT${i}">Ngày cưới ${i + 1}:</label><input id="wedT${i}" type="datetime-local" class="ink fill"></span>`
      + `<span class="pair place"><label class="lbl" for="wedP${i}">tại</label><input id="wedP${i}" class="ink fill" placeholder="địa điểm" autocomplete="off"></span>`
      + `<button type="button" class="x noprint" aria-label="Xoá ngày cưới ${i + 1}">×</button>`;
    box.append(row);
    const w = { row, t: row.querySelector(`#wedT${i}`), p: row.querySelector(`#wedP${i}`) };
    row.querySelector('.x').addEventListener('click', () => {
      for (let j = i; j < N_WED - 1; j++) { weds[j].t.value = weds[j + 1].t.value; weds[j].p.value = weds[j + 1].p.value; }
      weds[N_WED - 1].t.value = ''; weds[N_WED - 1].p.value = '';
      state.nWed = Math.max(1, state.nWed - 1); layout(); changed();
    });
    weds.push(w);
  }
}

function layout() {
  let stt = 0;
  lines.forEach((l, i) => {
    const vis = i < state.nLines;
    l.tr.hidden = !vis;
    l.tr.classList.toggle('empty', !l.combo.text && getMoney(l.price) == null);
    if (vis) l.tr.querySelector('.stt').textContent = ++stt;
  });
  $('addLineBtn').disabled = state.nLines >= N_LINES;
  $('addLineBtn').textContent = state.nLines >= N_LINES ? 'Đã đủ 6 dịch vụ thêm' : '+ Thêm dòng dịch vụ';
  weds.forEach((w, i) => {
    w.row.hidden = i >= state.nWed;
    w.row.classList.toggle('empty', !w.t.value && !w.p.value);
  });
  $('addWedBtn').disabled = state.nWed >= N_WED;
  $('rowInAn').hidden = !state.showInAn;
  $('addInAnBtn').hidden = state.showInAn;
  $('rowPhuThu').classList.toggle('empty', !$('phuThuDetail').value && getMoney($('phuThu')) == null);
  $('newCust').hidden = !state.newCust;
  $('custPickLine').hidden = state.newCust;
  $('custInfo').hidden = state.newCust;
}

// ---------- khách hàng ----------
function custName(label) { return String(label || '').split('|')[0].trim(); }
function showCust(c) {
  pickedCust = c || null;
  $('custPhone').textContent = c ? c.phone || '—' : '';
  $('custSrc').textContent = c ? c.src || '—' : '';
  $('sigCust').textContent = c ? custName(c.label) : (state.newCust ? $('ncName').value.trim() : '');
}
function checkDup() {
  const d = digits($('ncPhone').value);
  const warn = $('dupWarn');
  if (d.length < 9) { warn.hidden = true; return; }
  const tail = d.slice(-9);
  const hit = data.customers.find((c) => digits(c.phone).slice(-9) === tail);
  if (!hit) { warn.hidden = true; return; }
  warn.hidden = false;
  warn.textContent = `Số này đã có trong 2.0: ${hit.label}. `;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-mini'; b.textContent = 'Dùng khách này';
  b.addEventListener('click', () => { state.newCust = false; custCombo.set(hit); showCust(hit); layout(); changed(); });
  warn.append(b);
}

// ---------- thu thập / đổ dữ liệu ----------
function collect() {
  const inAnOn = state.showInAn;
  return {
    bienNhan: $('bienNhan').value.trim(),
    ngayBN: fromInput($('ngayBN').value),
    phanLoai: [$('plGoi'), $('plCombo')].filter((c) => c.checked).map((c) => c.value),
    custId: pickedCust ? pickedCust.id : null,
    custLabel: pickedCust ? pickedCust.label : '',
    items: lines.map((l) => ({ name: l.combo.value ? l.combo.value.name : '', price: getMoney(l.price) })),
    inAn: { name: inAnOn && inAnCombo.value ? inAnCombo.value.name : '', qty: inAnOn ? (digits($('inAnQty').value) ? Number(digits($('inAnQty').value)) : null) : null },
    phuThu: { detail: $('phuThuDetail').value.trim(), amount: getMoney($('phuThu')) },
    chietKhau: getMoney($('chietKhau')),
    ngayChup: fromInput($('ngayChup').value),
    ngayHoi: fromInput($('ngayHoi').value),
    cuoi: weds.map((w) => ({ t: fromInput(w.t.value), place: w.p.value.trim() })),
    ghiChu: $('ghiChu').value.trim(),
  };
}
function fill(p) {
  $('bienNhan').value = p.bienNhan || '';
  $('ngayBN').value = toInput(p.ngayBN, false);
  $('plGoi').checked = p.phanLoai.includes('GÓI CHỤP');
  $('plCombo').checked = p.phanLoai.includes('Combo');
  let c = null;
  if (p.custId) {
    c = data.customers.find((x) => x.id === p.custId);
    if (!c) { c = { id: p.custId, label: p.custLabel || '(khách)', phone: '', src: '' }; data.customers.push(c); }
  }
  custCombo.set(c); showCust(c);
  let last = 0;
  lines.forEach((l, i) => {
    const it = p.items[i] || {};
    l.combo.setByKey(it.name || '');
    setMoney(l.price, it.price);
    if (it.price != null) l.price.dataset.touched = '1'; else delete l.price.dataset.touched;
    if (it.name || it.price != null) last = i + 1;
  });
  state.nLines = Math.max(2, last);
  state.showInAn = !!(p.inAn && p.inAn.name);
  inAnCombo.setByKey(state.showInAn ? p.inAn.name : '');
  $('inAnQty').value = p.inAn && p.inAn.qty != null ? p.inAn.qty : '';
  $('phuThuDetail').value = p.phuThu.detail || '';
  setMoney($('phuThu'), p.phuThu.amount);
  setMoney($('chietKhau'), p.chietKhau);
  $('ngayChup').value = toInput(p.ngayChup, true);
  $('ngayHoi').value = toInput(p.ngayHoi, true);
  let lw = 0;
  weds.forEach((w, i) => {
    const x = p.cuoi[i] || {};
    w.t.value = toInput(x.t, true); w.p.value = x.place || '';
    if (x.t != null || x.place) lw = i + 1;
  });
  state.nWed = Math.max(1, lw);
  $('ghiChu').value = p.ghiChu || '';
  layout(); recalc();
}
function blankPayload() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return {
    bienNhan: '', ngayBN: today.getTime(), phanLoai: [], custId: null, custLabel: '',
    items: Array.from({ length: N_LINES }, () => ({ name: '', price: null })),
    inAn: { name: '', qty: null }, phuThu: { detail: '', amount: null }, chietKhau: null,
    ngayChup: null, ngayHoi: null, cuoi: Array.from({ length: N_WED }, () => ({ t: null, place: '' })), ghiChu: '',
  };
}

// ---------- tính tiền ----------
function totals() {
  const items = lines.reduce((s, l) => s + (getMoney(l.price) || 0), 0);
  let inAn = 0;
  if (state.showInAn && inAnCombo.value) inAn = (inAnCombo.value.price || 0) * (Number(digits($('inAnQty').value)) || 0);
  const sub = items + inAn + (getMoney($('phuThu')) || 0);
  return { inAn, sub, grand: sub - (getMoney($('chietKhau')) || 0) };
}
function recalc() {
  const t = totals();
  $('subTotal').textContent = fmt(t.sub) || '0';
  $('grand').textContent = fmt(t.grand) || '0';
  $('words').textContent = toWords(t.grand);
  const p = inAnCombo && inAnCombo.value;
  const q = Number(digits($('inAnQty').value)) || 0;
  $('inAnTotal').textContent = p && q ? fmt(t.inAn) : '';
  $('inAnHint').textContent = p ? (p.price != null ? `đơn giá ${fmt(p.price)}${q ? ` × ${q}` : ' — nhập số lượng'}` : 'chưa có giá ở bảng 1.3') : '';
}

// ---------- nháp (chỉ trong máy này) ----------
let draftTimer;
function saveDraft() {
  if (state.mode !== 'new') return;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try {
      const p = collect();
      const hasContent = p.custId || p.items.some((i) => i.name || i.price != null) || p.ghiChu || state.newCust;
      if (!hasContent) { localStorage.removeItem(DRAFT_KEY); return; }
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        p, newCust: state.newCust, nc: { name: $('ncName').value, phone: $('ncPhone').value, src: $('ncSrc').value }, at: Date.now(),
      }));
    } catch (_) {}
  }, 400);
}
function loadDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (_) { return null; } }
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (_) {} }

// ---------- trạng thái ----------
function changed() {
  layout(); recalc();
  $('stamp').hidden = true;
  saveDraft();
}
function setStatus(kind, text) {
  const s = $('status');
  s.className = 'status ' + kind;
  s.innerHTML = '<span class="dot"></span>';
  s.append(document.createTextNode(' ' + text));
}
let toastTimer;
function toast(msg, kind = '') {
  const t = $('toast');
  t.textContent = msg; t.className = 'toast ' + kind; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, kind === 'bad' ? 6000 : 3500);
}

function enterNew({ useDraft = true } = {}) {
  state.mode = 'new'; state.recordId = null; state.before = null; state.newCust = false;
  state.showInAn = false;
  $('ncName').value = ''; $('ncPhone').value = ''; $('ncSrc').value = ''; $('dupWarn').hidden = true;
  const d = useDraft ? loadDraft() : null;
  fill(d ? d.p : blankPayload());
  if (d && d.newCust) {
    state.newCust = true;
    $('ncName').value = d.nc.name || ''; $('ncPhone').value = d.nc.phone || ''; $('ncSrc').value = d.nc.src || '';
    showCust(null); checkDup();
  }
  $('draftBanner').hidden = !d;
  $('soHD').textContent = 'tự sinh khi lưu'; $('soHD').classList.add('pending');
  $('sigSeller').textContent = data.userName || '';
  $('modeLabel').textContent = 'Đơn mới';
  $('saveBtn').textContent = 'Lưu đơn vào bảng 2.1';
  $('stamp').hidden = true;
  $('footNote').textContent = '';
  layout(); recalc();
}
function enterEdit(res, { justSaved = false } = {}) {
  state.mode = 'edit'; state.recordId = res.recordId; state.before = res.payload; state.newCust = false;
  fill(res.payload);
  $('soHD').textContent = res.soHD || '(chưa có số)'; $('soHD').classList.remove('pending');
  $('sigSeller').textContent = res.seller || '';
  $('modeLabel').textContent = 'Sửa ' + (res.soHD || 'đơn');
  $('saveBtn').textContent = 'Lưu thay đổi';
  $('draftBanner').hidden = true;
  $('selBanner').hidden = true;
  const st = $('stamp');
  st.hidden = !justSaved;
  if (justSaved) st.innerHTML = `ĐÃ LƯU<small>${res.soHD || ''}</small>`;
  layout(); recalc();
}

function validate() {
  const errs = [];
  if (state.newCust) {
    if (!$('ncName').value.trim()) { errs.push('Chưa ghi tên khách mới.'); $('ncName').classList.add('invalid'); }
  } else if (!pickedCust) { errs.push('Chưa chọn khách hàng.'); custCombo.mark(true); }
  if (!lines[0].combo.value) { errs.push('Chưa chọn sản phẩm chính (dòng 1).'); lines[0].combo.mark(true); }
  lines.forEach((l, i) => {
    if (l.combo.invalid()) { errs.push(`Dòng ${i + 1}: "${l.combo.text}" không có trong danh sách — chọn từ danh sách xổ xuống.`); l.combo.mark(true); }
    if (!l.combo.value && !l.combo.text && getMoney(l.price) != null) { errs.push(`Dòng ${i + 1}: có tiền nhưng chưa chọn dịch vụ.`); l.combo.mark(true); }
  });
  if (state.showInAn) {
    if (inAnCombo.invalid()) { errs.push('In ấn: sản phẩm không có trong danh sách.'); inAnCombo.mark(true); }
    if (inAnCombo.value && !digits($('inAnQty').value)) { errs.push('In ấn: chưa nhập số lượng.'); $('inAnQty').classList.add('invalid'); }
  }
  return errs;
}

async function save() {
  if (state.busy) return;
  const errs = validate();
  if (errs.length) { toast(errs[0], 'bad'); return; }
  state.busy = true;
  const btn = $('saveBtn'); const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Đang lưu…';
  try {
    if (state.newCust) {
      const c = await api.createCustomer({ name: $('ncName').value.trim(), phone: $('ncPhone').value.trim(), src: $('ncSrc').value });
      data.customers.push(c);
      state.newCust = false; custCombo.set(c); showCust(c); layout();
      saveDraft();
    }
    const p = collect();
    const clientTotal = totals().grand;
    const res = state.mode === 'new' ? await api.createOrder(p) : await api.updateOrder(state.recordId, state.before, p);
    if (state.mode === 'new') clearDraft();
    enterEdit(res, { justSaved: true });
    const diff = res.total != null && Math.round(res.total) !== Math.round(clientTotal);
    $('footNote').textContent = diff
      ? `Lưu ý: bảng 2.1 đang tính tổng ${fmt(res.total)}đ, khác số trên phiếu (${fmt(clientTotal)}đ). Sếp mở đơn trong bảng kiểm tra giúp.`
      : '';
    const msg = res.changedCount === 0 ? 'Không có gì thay đổi.' : `Đã lưu ${res.soHD || ''} vào bảng 2.1.`;
    toast(msg, 'ok'); api.toast(msg);
  } catch (e) {
    console.error(e);
    btn.textContent = label;
    if (e && e.auth && api.login) {
      state.busy = false; btn.disabled = false;
      await askLogin(api, 'Phiên đăng nhập đã hết. Nhập lại mã rồi bấm Lưu lần nữa (phiếu vẫn giữ nguyên).');
      toast('Đã đăng nhập lại — bấm Lưu lần nữa.', 'ok');
      return;
    }
    toast('Chưa lưu được: ' + (e && e.message ? e.message : e), 'bad');
  } finally {
    state.busy = false; btn.disabled = false;
    if (btn.textContent === 'Đang lưu…') btn.textContent = label;
  }
}

async function openOrder(id) {
  const live = api.mode === 'worker' ? 'Đã kết nối bảng 2.1 Tạo đơn hàng' : 'Đã nối Lark · bảng 2.1 Tạo đơn hàng';
  try {
    $('selBanner').hidden = true;
    setStatus('live', 'Đang mở đơn…');
    const res = await api.loadOrder(id);
    enterEdit(res);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    toast('Không mở được đơn: ' + (e.message || e), 'bad');
  }
  setStatus('live', live);
}

let selTimer;
function onSelected(id) {
  if (state.mode === 'edit' && id === state.recordId) return;
  state.pendingSel = id;
  clearTimeout(selTimer);
  selTimer = setTimeout(async () => {
    try {
      const r = await api.loadOrder(id);
      if (state.pendingSel !== id) return;
      $('selText').textContent = `Sếp đang chọn ${r.soHD || 'một đơn'}${r.payload.custLabel ? ' · ' + custName(r.payload.custLabel) : ''} trong bảng.`;
      $('selBanner').hidden = false;
    } catch (_) {}
  }, 350);
}

// ---------- "Mở đơn cũ" (web app riêng không có ô chọn dòng của Lark) ----------
function setupOrderSheet() {
  const sheet = $('orderSheet'), listEl = $('orderList'), search = $('orderSearch');
  let orders = null, loading = false;
  const fmtDate = (ts) => { if (!ts) return ''; const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  function render() {
    listEl.textContent = '';
    if (!orders) { listEl.innerHTML = '<div class="order-empty">Đang tải…</div>'; return; }
    const q = norm(search.value), qd = digits(search.value);
    const rows = orders.filter((o) => !q || norm(`${o.soHD} ${o.cust} ${o.seller}`).includes(q) || (qd.length >= 2 && digits(o.soHD).includes(qd))).slice(0, 120);
    if (!rows.length) { listEl.innerHTML = '<div class="order-empty">Không thấy đơn nào.</div>'; return; }
    for (const o of rows) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'order-row';
      const no = document.createElement('span'); no.className = 'no'; no.textContent = o.soHD || '—';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = custName(o.cust) || '(chưa có khách)';
      const amt = document.createElement('span'); amt.className = 'amt'; amt.textContent = o.total != null ? fmt(o.total) + 'đ' : '';
      const sm = document.createElement('span'); sm.className = 'sm'; sm.textContent = [fmtDate(o.created), o.seller].filter(Boolean).join(' · ');
      b.append(no, nm, amt, sm);
      b.addEventListener('click', () => { sheet.hidden = true; openOrder(o.id); });
      listEl.append(b);
    }
  }
  async function load() {
    if (loading) return;
    loading = true; orders = null; render();
    try { orders = await api.listOrders(); } catch (e) {
      listEl.innerHTML = ''; const d = document.createElement('div'); d.className = 'order-empty'; d.textContent = 'Không tải được: ' + (e.message || e); listEl.append(d);
      loading = false; return;
    }
    loading = false; render();
  }
  $('openOldBtn').hidden = false;
  $('openOldBtn').addEventListener('click', () => { sheet.hidden = false; search.value = ''; load(); setTimeout(() => search.focus(), 50); });
  $('closeSheetBtn').addEventListener('click', () => { sheet.hidden = true; });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) sheet.hidden = true; });
  search.addEventListener('input', render);
}

function applyTheme(t) {
  if (t === 'DARK') document.documentElement.dataset.theme = 'dark';
  else if (t === 'LIGHT') document.documentElement.dataset.theme = 'light';
}

// ---------- khởi động ----------
function askLogin(api, message = '') {
  return new Promise((resolve) => {
    const box = $('login'), form = $('loginForm'), input = $('loginCode'), err = $('loginErr'), btn = $('loginBtn');
    box.hidden = false; err.textContent = message; input.value = '';
    setTimeout(() => input.focus(), 50);
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      btn.disabled = true; err.textContent = '';
      try {
        const r = await api.login(input.value);
        box.hidden = true; form.onsubmit = null;
        resolve(r);
      } catch (e) {
        err.textContent = e.message || 'Mã không đúng.';
        input.select();
      } finally { btn.disabled = false; }
    };
  });
}

async function pickAdapter() {
  const forceDemo = new URLSearchParams(location.search).has('demo');
  const inFrame = window.self !== window.top;
  let larkError = null;
  if (!forceDemo && !inFrame && /^https?:$/.test(location.protocol)) {
    let m = null, me = null;
    try { m = await import('./data-worker.js'); me = await m.probe(); } catch (_) { m = null; }   // không phải máy chủ hoá đơn
    if (m) {
      if (!me) me = await askLogin(m);
      setStatus('live', 'Đang tải danh sách khách & gói…');
      return { m, d: await m.init(), kind: 'worker', me };
    }
  }
  if (!forceDemo && inFrame) {
    try {
      const m = await import('./data-lark.js');
      const d = await m.init();
      return { m, d, kind: 'lark' };
    } catch (e) {
      if (!(e && e.message === 'not-in-lark')) larkError = e;
    }
  }
  const m = await import('./data-demo.js');
  return { m, d: await m.init(), kind: 'demo', larkError };
}

async function main() {
  buildLines();
  buildWeddings();
  const picked = await pickAdapter();
  api = picked.m; data = picked.d;

  custCombo = makeCombo($('custBox'), {
    placeholder: 'gõ tên, mã KH hoặc số điện thoại',
    source: () => data.customers,
    key: (c) => c.label,
    sub: (c) => c.phone,
    extra: (c) => c.phone,
    onPick: (c, o) => { if (!(o && o.typing)) { showCust(c); changed(); } else showCust(null); },
  });
  inAnCombo = makeCombo($('inAnBox'), {
    placeholder: 'chọn sản phẩm in',
    source: () => data.inAn,
    key: (p) => p.name,
    sub: (p) => (p.price != null ? fmt(p.price) : ''),
    onPick: () => changed(),
  });

  const src = $('ncSrc');
  src.innerHTML = '<option value="">— chọn —</option>';
  data.sources.forEach((s) => { const o = document.createElement('option'); o.value = s; o.textContent = s; src.append(o); });

  ['phuThu', 'chietKhau'].forEach((id) => bindMoney($(id)));
  $('inAnQty').addEventListener('input', () => { $('inAnQty').value = digits($('inAnQty').value); $('inAnQty').classList.remove('invalid'); });
  $('ncName').addEventListener('input', () => { $('ncName').classList.remove('invalid'); $('sigCust').textContent = $('ncName').value.trim(); });
  $('ncPhone').addEventListener('input', checkDup);
  $('paper').addEventListener('input', changed);
  $('paper').addEventListener('change', changed);

  $('addLineBtn').addEventListener('click', () => {
    state.nLines = Math.min(N_LINES, state.nLines + 1); layout();
    lines[state.nLines - 1].combo.input.focus();
  });
  $('addWedBtn').addEventListener('click', () => { state.nWed = Math.min(N_WED, state.nWed + 1); layout(); weds[state.nWed - 1].t.focus(); });
  $('addInAnBtn').addEventListener('click', () => { state.showInAn = true; layout(); inAnCombo.input.focus(); });
  $('rmInAn').addEventListener('click', () => { state.showInAn = false; inAnCombo.set(null); $('inAnQty').value = ''; changed(); });
  $('newCustBtn').addEventListener('click', () => {
    state.newCust = true; custCombo.set(null); showCust(null); layout(); $('ncName').focus(); saveDraft();
  });
  $('oldCustBtn').addEventListener('click', () => { state.newCust = false; $('dupWarn').hidden = true; layout(); custCombo.input.focus(); saveDraft(); });
  $('saveBtn').addEventListener('click', save);
  $('printBtn').addEventListener('click', () => { layout(); window.print(); });
  $('newBtn').addEventListener('click', () => enterNew());
  $('discardDraftBtn').addEventListener('click', () => { clearDraft(); enterNew({ useDraft: false }); });
  $('openSelBtn').addEventListener('click', () => state.pendingSel && openOrder(state.pendingSel));
  window.addEventListener('beforeprint', layout);

  if (picked.kind === 'worker') {
    setStatus('live', 'Đã kết nối bảng 2.1 Tạo đơn hàng');
    $('whoName').textContent = data.userName || (picked.me && picked.me.name) || '';
    $('who').hidden = false;
    $('logoutBtn').addEventListener('click', async () => {
      try { await api.logout(); } catch (_) {}
      location.reload();
    });
  } else if (picked.kind === 'lark') {
    setStatus('live', 'Đã nối Lark · bảng 2.1 Tạo đơn hàng');
    applyTheme(await api.getTheme());
    api.onTheme(applyTheme);
    api.onSelection(onSelected);
  } else if (picked.larkError) {
    setStatus('err', 'Chưa nối được Lark: ' + (picked.larkError.message || picked.larkError) + ' — đang ở chế độ xem thử, KHÔNG ghi dữ liệu');
  } else {
    setStatus('demo', 'Bản xem thử — dữ liệu mẫu, không ghi vào Lark');
  }

  if (typeof api.listOrders === 'function') setupOrderSheet();

  enterNew();
  if (picked.kind === 'lark') {
    const sel = await api.getSelectedOrderId();
    if (sel) onSelected(sel);
  }
}

main().catch((e) => {
  console.error(e);
  setStatus('err', 'Lỗi khởi động: ' + (e.message || e));
});

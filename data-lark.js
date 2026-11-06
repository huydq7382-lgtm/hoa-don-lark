// Lớp dữ liệu — chạy BÊN TRONG Lark Base (tiện ích / extension).
// Ghi bằng chính tài khoản người đang mở => cột "Kinh Doanh" (Người tạo) đúng tên nhân viên.
// Muốn đổi sang web app riêng (cách 2): viết data-worker.js có cùng các hàm bên dưới, app.js giữ nguyên.

import { bitable } from './sdk/index.mjs';

// ===== Cấu hình bảng & trường (ID lấy từ base "Sương Nguyễn Studio") =====
export const T = {
  order: 'tbleIGeDyIfqUn7f',   // 2.1 Tạo đơn hàng
  cust: 'tblXLYce3C4A6OJB',    // 2.0 Khách Hàng
  pkg: 'tblI4I7Z4mLxxs24',     // 1.2 Gói dịch vụ (giá bán gợi ý)
  print: 'tblaSgH1liiRQn0n',   // 1.3 Sản phẩm in ấn
};
const F = {
  soHD: 'fldsGZDjZc', cust: 'fldCETxsc3', phanLoai: 'fldETCXWSM', seller: 'fldaMIZ4yU',
  items: [
    ['fldQ4orEEE', 'fldkt1482D'], // Sản phẩm chính / Đơn giá sản phẩm chính
    ['fldekDor6s', 'fldFxNeMmk'], // SPDV 1 / Đơn giá dịch vụ 1
    ['fldPK8nVnw', 'fldZs4Gfak'],
    ['fldL5kK6il', 'fldt02CP2c'],
    ['fld0BKa67A', 'fldqP8bo57'],
    ['fldjU6QXet', 'fldHdM9GH3'],
    ['fldoU5kU2C', 'fldC84LsXr'], // SPDV 6
  ],
  phuThuDetail: 'fldVgcVeTb', phuThu: 'fldYXmsLn7', chietKhau: 'fldERfKMDV',
  inAn: 'fldkeMSxSp', inAnQty: 'fld3WBILsK',
  ngayChup: 'fldHw1lsPd', ngayHoi: 'fldorTOFf2',
  cuoi: [['fldHRuGL2Z', 'fldCcddpLz'], ['fldhJZCGWJ', 'fld48hlCl0'], ['fld9kCX5T6', 'fldEVcRLT5'], ['fldxCLirEt', 'fld382mlcC']],
  ghiChu: 'fldvBCsSPI', bienNhan: 'fldqZETlrV', ngayBN: 'fldQjVfDmB', total: 'fldkDC8j2x',
  ngayLayDo: 'fldGv4gVIA', ngayNhanHinh: 'fldiH0QUo9',
};
const FC = { label: 'fldaR8R2HS', name: 'fldUzrGe9R', phone: 'fldXVypinb', src: 'fldvVSjRhk' };
const FP = { name: 'fldPmDRlea', price: 'fldTapY7Yl', cat: 'fldxGCKDAT' };
const FI = { name: 'fldZ6QADfH', price: 'fldQNe6h0r' };

// ===== tiện ích đọc giá trị ô =====
const txt = (v) => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(txt).join('');
  if (typeof v === 'object') {
    if ('text' in v && v.text != null) return String(v.text);
    if ('name' in v && v.name != null) return String(v.name);
    if ('value' in v) return txt(v.value);
  }
  return '';
};
const num = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  if (Array.isArray(v)) return v.length ? num(v[0]) : null;
  if (typeof v === 'object' && 'value' in v) return num(v.value);
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const seg = (s) => (s ? [{ type: 'text', text: s }] : null);

function withTimeout(p, ms, msg) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
}

async function readAll(table, maxPages = 20) {
  const out = []; let pageToken;
  for (let i = 0; i < maxPages; i++) {
    const res = await table.getRecordsByPage({ pageSize: 200, pageToken });
    out.push(...(res.records || []));
    if (!res.hasMore) break;
    pageToken = res.pageToken;
  }
  return out;
}

// ===== adapter =====
let tOrder, tCust, opt = {};   // opt[fieldId] = Map(name -> optionId)

function optFor(fieldId, name) {
  const id = opt[fieldId]?.get(name);
  if (!id) throw new Error(`"${name}" không có trong danh sách lựa chọn của bảng 2.1. Sếp thêm lựa chọn này trong Lark trước rồi lưu lại.`);
  return { id, text: name };
}

function custLabelOf(fields) {
  return txt(fields[FC.label]).trim() || txt(fields[FC.name]).trim();
}

export const mode = 'lark';

export async function init() {
  // kiểm tra đang chạy trong Lark
  await withTimeout(bitable.base.getSelection(), 5000, 'not-in-lark');

  tOrder = await bitable.base.getTableById(T.order);
  tCust = await bitable.base.getTableById(T.cust);
  const [tPkg, tPrint] = await Promise.all([bitable.base.getTableById(T.pkg), bitable.base.getTableById(T.print)]);

  const metas = await tOrder.getFieldMetaList();
  for (const m of metas) {
    const options = m.property && m.property.options;
    if (Array.isArray(options)) opt[m.id] = new Map(options.filter((o) => o.name).map((o) => [o.name, o.id]));
  }
  const missing = [F.soHD, F.cust, F.items[0][0], F.items[0][1], F.total].filter((id) => !metas.find((m) => m.id === id));
  if (missing.length) throw new Error('Bảng 2.1 đã đổi cấu trúc (thiếu trường ' + missing.join(', ') + '). Báo Sen cập nhật.');

  const custMetas = await tCust.getFieldMetaList();
  const srcMeta = custMetas.find((m) => m.id === FC.src);
  opt[FC.src] = new Map(((srcMeta && srcMeta.property && srcMeta.property.options) || []).map((o) => [o.name, o.id]));

  const [pkgRecs, printRecs, custRecs] = await Promise.all([readAll(tPkg), readAll(tPrint), readAll(tCust)]);

  const pkgInfo = new Map();
  for (const r of pkgRecs) {
    const name = txt(r.fields[FP.name]).trim();
    if (name && !pkgInfo.has(name)) pkgInfo.set(name, { price: num(r.fields[FP.price]), cat: txt(r.fields[FP.cat]) });
  }
  const products = [...(opt[F.items[0][0]]?.keys() || [])].map((name) => {
    const info = pkgInfo.get(name.trim()) || {};
    return { name, price: info.price ?? null, cat: info.cat || 'Khác' };
  });

  const printPrice = new Map();
  for (const r of printRecs) {
    const name = txt(r.fields[FI.name]).trim();
    if (name && !printPrice.has(name)) printPrice.set(name, num(r.fields[FI.price]));
  }
  const inAn = [...(opt[F.inAn]?.keys() || [])].map((name) => ({ name, price: printPrice.get(name.trim()) ?? null }));

  const customers = custRecs.map((r) => ({
    id: r.recordId,
    label: custLabelOf(r.fields),
    phone: txt(r.fields[FC.phone]),
    src: txt(r.fields[FC.src]),
  })).filter((c) => c.label);

  // tên người đang dùng: so userId với cột "Kinh Doanh" (Người tạo) của các đơn gần đây
  let userName = '';
  try {
    const uid = await bitable.bridge.getUserId();
    const page = await tOrder.getRecordsByPage({ pageSize: 200 });
    for (const r of page.records || []) {
      const u = (r.fields[F.seller] || []).find((x) => x && x.id === uid);
      if (u) { userName = u.name || ''; break; }
    }
  } catch (_) { /* không bắt buộc */ }

  const phanLoai = [...(opt[F.phanLoai]?.keys() || [])];
  const sources = [...opt[FC.src].keys()];
  return { products, inAn, customers, sources, phanLoai, userName };
}

export async function getTheme() {
  try { return await bitable.bridge.getTheme(); } catch (_) { return null; }
}
export function onTheme(cb) {
  try { bitable.bridge.onThemeChange((ev) => cb(ev && ev.data && ev.data.theme)); } catch (_) {}
}

export async function getSelectedOrderId() {
  try { const s = await bitable.base.getSelection(); return s.tableId === T.order ? s.recordId : null; } catch (_) { return null; }
}
export function onSelection(cb) {
  bitable.base.onSelectionChange((ev) => {
    const s = ev && ev.data;
    if (s && s.tableId === T.order && s.recordId) cb(s.recordId);
  });
}

export async function createCustomer({ name, phone, src }) {
  const fields = { [FC.name]: seg(name) };
  if (phone) fields[FC.phone] = phone;
  if (src && opt[FC.src].get(src)) fields[FC.src] = { id: opt[FC.src].get(src), text: src };
  const id = await tCust.addRecord({ fields });
  await new Promise((r) => setTimeout(r, 900)); // chờ công thức "Tên | KH…" tính xong
  let label = name;
  try { label = custLabelOf((await tCust.getRecordById(id)).fields) || name; } catch (_) {}
  return { id, label, phone: phone || '', src: src || '' };
}

// payload (logic) -> { fieldId: giá trị ô thô }
function toFields(p) {
  const f = {};
  f[F.bienNhan] = seg(p.bienNhan);
  f[F.ngayBN] = p.ngayBN ?? null;
  f[F.phanLoai] = p.phanLoai.length ? p.phanLoai.map((n) => optFor(F.phanLoai, n)) : null;
  f[F.cust] = p.custId ? { recordIds: [p.custId], tableId: T.cust, text: p.custLabel || '', type: 'text' } : null;
  F.items.forEach(([fn, fp], i) => {
    const it = p.items[i] || {};
    f[fn] = it.name ? optFor(fn, it.name) : null;
    f[fp] = it.name && it.price != null ? it.price : null;
  });
  f[F.inAn] = p.inAn.name ? optFor(F.inAn, p.inAn.name) : null;
  f[F.inAnQty] = p.inAn.name && p.inAn.qty != null ? p.inAn.qty : null;
  f[F.phuThuDetail] = seg(p.phuThu.detail);
  f[F.phuThu] = p.phuThu.amount ?? null;
  f[F.chietKhau] = p.chietKhau ?? null;
  f[F.ngayChup] = p.ngayChup ?? null;
  f[F.ngayHoi] = p.ngayHoi ?? null;
  F.cuoi.forEach(([ft, fpl], i) => {
    const w = p.cuoi[i] || {};
    f[ft] = w.t ?? null;
    f[fpl] = seg(w.place);
  });
  f[F.ngayLayDo] = p.ngayLayDo ?? null;
  f[F.ngayNhanHinh] = p.ngayNhanHinh ?? null;
  f[F.ghiChu] = seg(p.ghiChu);
  return f;
}

// đọc một đơn -> payload (logic)
function fromFields(fields) {
  const g = (id) => fields[id];
  return {
    bienNhan: txt(g(F.bienNhan)),
    ngayBN: num(g(F.ngayBN)),
    phanLoai: (Array.isArray(g(F.phanLoai)) ? g(F.phanLoai) : []).map(txt).filter(Boolean),
    custId: (g(F.cust) && (g(F.cust).recordIds || g(F.cust).record_ids || [])[0]) || null,
    custLabel: txt(g(F.cust)),
    items: F.items.map(([fn, fp]) => ({ name: txt(g(fn)), price: num(g(fp)) })),
    inAn: { name: txt(g(F.inAn)), qty: num(g(F.inAnQty)) },
    phuThu: { detail: txt(g(F.phuThuDetail)), amount: num(g(F.phuThu)) },
    chietKhau: num(g(F.chietKhau)),
    ngayChup: num(g(F.ngayChup)),
    ngayHoi: num(g(F.ngayHoi)),
    cuoi: F.cuoi.map(([ft, fpl]) => ({ t: num(g(ft)), place: txt(g(fpl)) })),
    ngayLayDo: num(g(F.ngayLayDo)),
    ngayNhanHinh: num(g(F.ngayNhanHinh)),
    ghiChu: txt(g(F.ghiChu)),
  };
}

async function readBack(id) {
  const rec = await tOrder.getRecordById(id);
  const fields = rec.fields || {};
  return {
    recordId: id,
    soHD: txt(fields[F.soHD]),
    total: num(fields[F.total]),
    seller: (fields[F.seller] || []).map((u) => u && u.name).filter(Boolean).join(', '),
    payload: fromFields(fields),
  };
}

export async function createOrder(p) {
  const all = toFields(p);
  const fields = {};
  for (const [k, v] of Object.entries(all)) if (v != null) fields[k] = v;   // đơn mới: bỏ ô trống
  const id = await tOrder.addRecord({ fields });
  await new Promise((r) => setTimeout(r, 1200)); // chờ Lark tính số HĐ + tổng
  return readBack(id);
}

export async function loadOrder(id) {
  return readBack(id);
}

// chỉ ghi những ô THẬT SỰ đổi so với lúc mở đơn
export async function updateOrder(id, before, after) {
  const a = toFields(before), b = toFields(after);
  const changed = {};
  for (const k of Object.keys(b)) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) changed[k] = b[k];
  if (!Object.keys(changed).length) return { ...(await readBack(id)), changedCount: 0 };
  await tOrder.setRecord(id, { fields: changed });
  await new Promise((r) => setTimeout(r, 1000));
  return { ...(await readBack(id)), changedCount: Object.keys(changed).length };
}

export async function toast(message, type = 'success') {
  try { await bitable.ui.showToast({ toastType: type, message }); } catch (_) {}
}

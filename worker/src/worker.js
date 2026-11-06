// Cloudflare Worker — "Sổ hoá đơn" (cách 2): web app riêng, mở trên điện thoại/máy tính.
// - Phục vụ giao diện tĩnh (thư mục public/, cùng app.js với tiện ích Lark)
// - /api/*: đăng nhập bằng mã nhân viên, đọc/ghi Lark Base bằng tenant token (App Secret nằm trong secret của Worker)
// Đơn tạo từ đây có "Kinh Doanh" (người tạo) = app; người lập thật ghi vào cột "Sale phụ trách".
//
// Secret (wrangler secret put): LARK_APP_SECRET, SESSION_KEY, STAFF (JSON [{name, open_id, code}])

const LARK = 'https://open.larksuite.com/open-apis';
const COOKIE = 'hd_s';
const SESSION_DAYS = 60;

// ===== cấu trúc bảng (ID không đổi khi đổi tên cột) =====
const F = {
  soHD: 'fldsGZDjZc', cust: 'fldCETxsc3', phanLoai: 'fldETCXWSM', seller: 'fldaMIZ4yU', salePT: 'flda610apP',
  created: 'fldo4uAngl',
  items: [
    ['fldQ4orEEE', 'fldkt1482D'], ['fldekDor6s', 'fldFxNeMmk'], ['fldPK8nVnw', 'fldZs4Gfak'], ['fldL5kK6il', 'fldt02CP2c'],
    ['fld0BKa67A', 'fldqP8bo57'], ['fldjU6QXet', 'fldHdM9GH3'], ['fldoU5kU2C', 'fldC84LsXr'],
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
// tên cột lúc viết code — dùng khi ID không khớp (VD: bảng thử nghiệm cùng tên cột)
const NAMES = { "fld0BKa67A": "SPDV 4", "fld382mlcC": "Địa điểm 4", "fld3WBILsK": "SL In Ấn", "fld48hlCl0": "Địa điểm 2", "fld9kCX5T6": "Ngày đám cưới 3", "fldC84LsXr": "Đơn giá dịch vụ 6", "fldCETxsc3": "Tên khách hàng", "fldCcddpLz": "Địa điểm 1", "fldERfKMDV": "Chiết khấu ($)", "fldETCXWSM": "Phân loại", "fldEVcRLT5": "Địa điểm 3", "fldFxNeMmk": "Đơn giá dịch vụ 1", "fldHRuGL2Z": "Ngày đám cưới 1", "fldHdM9GH3": "Đơn giá dịch vụ 5", "fldHw1lsPd": "Ngày chụp", "fldL5kK6il": "SPDV 3", "fldPK8nVnw": "SPDV 2", "fldPmDRlea": "Sản Phẩm", "fldQ4orEEE": "Sản phẩm chính", "fldQNe6h0r": "Giá bán", "fldQjVfDmB": "Ngày Biên nhận", "fldTapY7Yl": "Giá Bán", "fldUzrGe9R": "Tên Khách Hàng (Cô Dâu)", "fldVgcVeTb": "Chi tiết phụ thu", "fldXVypinb": "Số điện thoại", "fldYXmsLn7": "Phụ thu", "fldZ6QADfH": "Sản Phẩm", "fldZs4Gfak": "Đơn giá dịch vụ 2", "flda610apP": "Sale phụ trách", "fldaMIZ4yU": "Kinh Doanh", "fldaR8R2HS": "Tên Khách Hàng", "fldekDor6s": "SPDV 1", "fldhJZCGWJ": "Ngày đám cưới 2", "fldjU6QXet": "SPDV 5", "fldkDC8j2x": "Tổng Đơn Hàng (VAT)", "fldkeMSxSp": "In Ấn", "fldkt1482D": "Đơn giá sản phẩm chính", "fldo4uAngl": "Ngày tạo hợp đồng", "fldoU5kU2C": "SPDV 6", "fldorTOFf2": "Ngày đám hỏi", "fldqP8bo57": "Đơn giá dịch vụ 4", "fldqZETlrV": "Mã Biên Nhận", "fldsGZDjZc": "Mã hợp đồng.", "fldt02CP2c": "Đơn giá dịch vụ 3", "fldvBCsSPI": "Ghi chú", "fldvVSjRhk": "Nguồn khách hàng", "fldxCLirEt": "Ngày đám cưới 4", "fldxGCKDAT": "Danh Mục", "fldGv4gVIA": "Ngày lấy đồ", "fldiH0QUo9": "Ngày nhận hình" };
const ORDER_READ = [F.soHD, F.cust, F.phanLoai, F.seller, F.salePT, F.created, F.total, F.phuThuDetail, F.phuThu, F.chietKhau,
  F.inAn, F.inAnQty, F.ngayChup, F.ngayHoi, F.ghiChu, F.bienNhan, F.ngayBN, ...F.items.flat(), ...F.cuoi.flat()];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class UserError extends Error {}

// ===== tiện ích đọc giá trị =====
const txt = (v) => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(txt).join('');
  if (typeof v === 'object') {
    if (v.text != null) return String(v.text);
    if (v.name != null) return String(v.name);
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
const linkIds = (v) => (Array.isArray(v) ? v : v ? [v] : [])
  .flatMap((x) => (typeof x === 'string' ? [x] : (x && (x.record_ids || x.link_record_ids)) || []));
const userNames = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((u) => u && u.name).filter(Boolean);
const list = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);

// ===== Lark Open API =====
let tok = { t: null, exp: 0 };
async function tenantToken(env) {
  if (tok.t && Date.now() < tok.exp) return tok.t;
  const r = await fetch(LARK + '/auth/v3/tenant_access_token/internal', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: env.LARK_APP_ID, app_secret: env.LARK_APP_SECRET }),
  });
  const d = await r.json();
  if (d.code) throw new Error('Không lấy được token Lark: ' + d.msg);
  tok = { t: d.tenant_access_token, exp: Date.now() + (d.expire - 300) * 1000 };
  return tok.t;
}
async function lark(env, method, path, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(LARK + path, {
      method,
      headers: { Authorization: 'Bearer ' + (await tenantToken(env)), 'Content-Type': 'application/json; charset=utf-8' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 429) { await sleep(700 * (attempt + 1)); continue; }
    const d = await r.json().catch(() => ({ code: -1, msg: 'HTTP ' + r.status }));
    if (d.code === 99991663 || d.code === 99991661 || d.code === 99991668) { tok = { t: null, exp: 0 }; continue; }
    if (d.code === 1254290 || d.code === 1254291) { await sleep(700 * (attempt + 1)); continue; } // quá tải / xung đột ghi
    if (d.code) throw new Error(`Lark báo lỗi ${d.code}: ${d.msg}`);
    return d.data || {};
  }
  throw new Error('Lark đang bận, Sếp thử lại sau vài giây.');
}
const tablePath = (env, t) => `/bitable/v1/apps/${env.BASE}/tables/${t}`;

const metaCache = new Map();
async function meta(env, table) {
  const c = metaCache.get(table);
  if (c && Date.now() - c.at < 5 * 60 * 1000) return c;
  const items = [];
  let pt = '';
  do {
    const d = await lark(env, 'GET', `${tablePath(env, table)}/fields?page_size=100${pt ? '&page_token=' + encodeURIComponent(pt) : ''}`);
    items.push(...(d.items || []));
    pt = d.has_more ? d.page_token : '';
  } while (pt);
  const byId = new Map(items.map((f) => [f.field_id, {
    name: f.field_name, type: f.type,
    options: ((f.property && f.property.options) || []).map((o) => o.name).filter((n) => n && n.trim()),
  }]));
  const idByName = new Map(items.map((f) => [f.field_name, f.field_id]));
  const canon = new Map();   // tên cột -> ID chuẩn trong code
  for (const cid of Object.keys(NAMES)) if (byId.has(cid)) canon.set(byId.get(cid).name, cid);
  for (const [cid, n] of Object.entries(NAMES)) if (!byId.has(cid) && idByName.has(n) && !canon.has(n)) canon.set(n, cid);
  const m = { byId, idByName, canon, at: Date.now() };
  metaCache.set(table, m);
  return m;
}
function fieldOf(m, id) {
  let f = m.byId.get(id);
  if (!f && NAMES[id] && m.idByName.has(NAMES[id])) f = m.byId.get(m.idByName.get(NAMES[id]));
  if (!f) throw new Error('Bảng đã đổi cấu trúc (thiếu cột "' + (NAMES[id] || id) + '"). Báo Sen cập nhật.');
  return f;
}
const nameOf = (m, id) => fieldOf(m, id).name;
const byIdFields = (m, fields) => {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) out[m.canon.get(k) || m.idByName.get(k) || k] = v;
  return out;
};

async function searchAll(env, table, ids, { sortId, desc = false, limit = 10000 } = {}) {
  const m = await meta(env, table);
  const body = { field_names: ids.map((id) => nameOf(m, id)), automatic_fields: false };
  if (sortId) body.sort = [{ field_name: nameOf(m, sortId), desc }];
  const out = [];
  let pt = '';
  do {
    const d = await lark(env, 'POST', `${tablePath(env, table)}/records/search?page_size=500&user_id_type=open_id${pt ? '&page_token=' + encodeURIComponent(pt) : ''}`, body);
    out.push(...(d.items || []));
    pt = d.has_more ? d.page_token : '';
  } while (pt && out.length < limit);
  return out.map((r) => ({ id: r.record_id, f: byIdFields(m, r.fields) }));
}

// ===== phiên đăng nhập (cookie ký HMAC) =====
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uText = (s) => b64u(new TextEncoder().encode(s));
const unb64uText = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
async function hmac(env, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SESSION_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}
async function sha16(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function staffList(env) {
  try { return JSON.parse(env.STAFF || '[]'); } catch (_) { return []; }
}
async function makeSession(env, s) {
  const payload = b64uText(JSON.stringify({ o: s.open_id, h: await sha16(normCode(s.code)), exp: Date.now() + SESSION_DAYS * 864e5 }));
  return payload + '.' + (await hmac(env, payload));
}
async function readSession(env, req) {
  const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  if (!m) return null;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig || sig !== (await hmac(env, payload))) return null;
  let p;
  try { p = JSON.parse(unb64uText(payload)); } catch (_) { return null; }
  if (!p.exp || p.exp < Date.now()) return null;
  for (const s of staffList(env)) {
    if (s.open_id === p.o && (await sha16(normCode(s.code))) === p.h) return s;   // đổi mã => phiên cũ hết hiệu lực
  }
  return null;
}
const cookieHeader = (v, maxAge) => `${COOKIE}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// ===== nghiệp vụ =====
function custLabel(f) { return txt(f[FC.label]).trim() || txt(f[FC.name]).trim(); }

async function apiInit(env, staff) {
  const [mo, mc] = await Promise.all([meta(env, env.ORDER_TABLE), meta(env, env.CUST_TABLE)]);
  const pkg = await searchAll(env, env.PKG_TABLE, [FP.name, FP.price, FP.cat]);
  const print = await searchAll(env, env.PRINT_TABLE, [FI.name, FI.price]);
  const cust = await searchAll(env, env.CUST_TABLE, [FC.label, FC.name, FC.phone, FC.src]);

  const pkgInfo = new Map();
  for (const r of pkg) {
    const n = txt(r.f[FP.name]).trim();
    if (n && !pkgInfo.has(n)) pkgInfo.set(n, { price: num(r.f[FP.price]), cat: txt(r.f[FP.cat]) });
  }
  const printPrice = new Map();
  for (const r of print) {
    const n = txt(r.f[FI.name]).trim();
    if (n && !printPrice.has(n)) printPrice.set(n, num(r.f[FI.price]));
  }
  return {
    products: fieldOf(mo, F.items[0][0]).options.map((name) => {
      const i = pkgInfo.get(name.trim()) || {};
      return { name, price: i.price ?? null, cat: i.cat || 'Khác' };
    }),
    inAn: fieldOf(mo, F.inAn).options.map((name) => ({ name, price: printPrice.get(name.trim()) ?? null })),
    customers: cust.map((r) => ({ id: r.id, label: custLabel(r.f), phone: txt(r.f[FC.phone]), src: txt(r.f[FC.src]) })).filter((c) => c.label),
    sources: fieldOf(mc, FC.src).options,
    phanLoai: fieldOf(mo, F.phanLoai).options,
    userName: staff.name,
  };
}

function checkOpt(m, id, name) {
  const f = fieldOf(m, id);
  if (!f.options.includes(name)) throw new UserError(`"${name}" không có trong danh sách của cột "${f.name}". Sếp thêm lựa chọn này trong Lark trước.`);
  return name;
}
// payload (logic) -> { tên cột: giá trị REST }
function toFields(p, m) {
  const f = {};
  const put = (id, v) => { f[nameOf(m, id)] = v; };
  const s = (v) => (v && String(v).trim() ? String(v).trim() : null);
  put(F.bienNhan, s(p.bienNhan));
  put(F.ngayBN, p.ngayBN ?? null);
  put(F.phanLoai, (p.phanLoai || []).length ? p.phanLoai.map((n) => checkOpt(m, F.phanLoai, n)) : null);
  put(F.cust, p.custId ? [p.custId] : null);
  F.items.forEach(([fn, fp], i) => {
    const it = (p.items || [])[i] || {};
    put(fn, it.name ? checkOpt(m, fn, it.name) : null);
    put(fp, it.name && it.price != null ? Number(it.price) : null);
  });
  const ia = p.inAn || {};
  put(F.inAn, ia.name ? checkOpt(m, F.inAn, ia.name) : null);
  put(F.inAnQty, ia.name && ia.qty != null ? Number(ia.qty) : null);
  put(F.phuThuDetail, s((p.phuThu || {}).detail));
  put(F.phuThu, (p.phuThu || {}).amount ?? null);
  put(F.chietKhau, p.chietKhau ?? null);
  put(F.ngayChup, p.ngayChup ?? null);
  put(F.ngayHoi, p.ngayHoi ?? null);
  F.cuoi.forEach(([ft, fpl], i) => {
    const w = (p.cuoi || [])[i] || {};
    put(ft, w.t ?? null);
    put(fpl, s(w.place));
  });
  put(F.ngayLayDo, p.ngayLayDo ?? null);
  put(F.ngayNhanHinh, p.ngayNhanHinh ?? null);
  put(F.ghiChu, s(p.ghiChu));
  return f;
}
function fromFields(f) {
  const custIds = linkIds(f[F.cust]);
  return {
    bienNhan: txt(f[F.bienNhan]),
    ngayBN: num(f[F.ngayBN]),
    phanLoai: list(f[F.phanLoai]).map(txt).filter(Boolean),
    custId: custIds[0] || null,
    custLabel: txt(f[F.cust]),
    items: F.items.map(([fn, fp]) => ({ name: txt(f[fn]), price: num(f[fp]) })),
    inAn: { name: txt(f[F.inAn]), qty: num(f[F.inAnQty]) },
    phuThu: { detail: txt(f[F.phuThuDetail]), amount: num(f[F.phuThu]) },
    chietKhau: num(f[F.chietKhau]),
    ngayChup: num(f[F.ngayChup]),
    ngayHoi: num(f[F.ngayHoi]),
    cuoi: F.cuoi.map(([ft, fpl]) => ({ t: num(f[ft]), place: txt(f[fpl]) })),
    ngayLayDo: num(f[F.ngayLayDo]),
    ngayNhanHinh: num(f[F.ngayNhanHinh]),
    ghiChu: txt(f[F.ghiChu]),
  };
}
async function readBack(env, id) {
  const m = await meta(env, env.ORDER_TABLE);
  const d = await lark(env, 'GET', `${tablePath(env, env.ORDER_TABLE)}/records/${encodeURIComponent(id)}?user_id_type=open_id`);
  const f = byIdFields(m, (d.record || {}).fields);
  const sale = userNames(f[F.salePT]);
  return {
    recordId: id,
    soHD: txt(f[F.soHD]),
    total: num(f[F.total]),
    seller: (sale.length ? sale : userNames(f[F.seller])).join(', '),
    payload: fromFields(f),
  };
}

async function apiCreateCustomer(env, body) {
  const name = String(body.name || '').trim();
  if (!name) throw new UserError('Chưa ghi tên khách.');
  const m = await meta(env, env.CUST_TABLE);
  const fields = { [nameOf(m, FC.name)]: name };
  if (body.phone) fields[nameOf(m, FC.phone)] = String(body.phone).trim();
  if (body.src) fields[nameOf(m, FC.src)] = checkOpt(m, FC.src, body.src);
  const d = await lark(env, 'POST', `${tablePath(env, env.CUST_TABLE)}/records`, { fields });
  const id = d.record.record_id;
  custCache = { at: 0, map: null };
  await sleep(900);
  let label = name;
  try {
    const r = await lark(env, 'GET', `${tablePath(env, env.CUST_TABLE)}/records/${id}`);
    label = custLabel(byIdFields(m, r.record.fields)) || name;
  } catch (_) {}
  return { id, label, phone: body.phone || '', src: body.src || '' };
}

async function apiCreateOrder(env, staff, p) {
  const m = await meta(env, env.ORDER_TABLE);
  const all = toFields(p, m);
  const fields = {};
  for (const [k, v] of Object.entries(all)) if (v != null) fields[k] = v;
  if (!fields[nameOf(m, F.cust)]) throw new UserError('Chưa chọn khách hàng.');
  if (!fields[nameOf(m, F.items[0][0])]) throw new UserError('Chưa chọn sản phẩm chính.');
  fields[nameOf(m, F.salePT)] = [{ id: staff.open_id }];
  const d = await lark(env, 'POST', `${tablePath(env, env.ORDER_TABLE)}/records?user_id_type=open_id`, { fields });
  await sleep(1200);
  return readBack(env, d.record.record_id);
}

async function apiUpdateOrder(env, id, body) {
  const m = await meta(env, env.ORDER_TABLE);
  const a = toFields(body.before || {}, m), b = toFields(body.after || {}, m);
  const changed = {};
  for (const k of Object.keys(b)) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) changed[k] = b[k];
  const n = Object.keys(changed).length;
  if (n) {
    await lark(env, 'PUT', `${tablePath(env, env.ORDER_TABLE)}/records/${encodeURIComponent(id)}?user_id_type=open_id`, { fields: changed });
    await sleep(1000);
  }
  return { ...(await readBack(env, id)), changedCount: n };
}

let custCache = { at: 0, map: null };
async function custLabels(env) {
  if (custCache.map && Date.now() - custCache.at < 2 * 60 * 1000) return custCache.map;
  const rows = await searchAll(env, env.CUST_TABLE, [FC.label, FC.name]);
  custCache = { at: Date.now(), map: new Map(rows.map((r) => [r.id, custLabel(r.f)])) };
  return custCache.map;
}

async function apiListOrders(env) {
  const [rows, labels] = await Promise.all([
    searchAll(env, env.ORDER_TABLE, [F.soHD, F.cust, F.created, F.total, F.salePT, F.seller], { sortId: F.created, desc: true, limit: 500 }),
    custLabels(env),
  ]);
  return rows.map((r) => {
    const sale = userNames(r.f[F.salePT]);
    return {
      id: r.id,
      soHD: txt(r.f[F.soHD]),
      cust: txt(r.f[F.cust]) || linkIds(r.f[F.cust]).map((id) => labels.get(id)).filter(Boolean).join(', '),
      created: num(r.f[F.created]),
      total: num(r.f[F.total]),
      seller: (sale.length ? sale : userNames(r.f[F.seller])).join(', '),
    };
  });
}

// ===== router =====
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});

async function handleApi(req, env, url) {
  const path = url.pathname.replace(/^\/api/, '');
  if (path === '/login' && req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const code = normCode(body.code);
    const s = code.length >= 6 && staffList(env).find((x) => normCode(x.code) === code);
    if (!s) { await sleep(700); return json({ error: 'Mã không đúng.' }, 401, { 'X-Backend': 'worker' }); }
    return json({ backend: 'worker', name: s.name }, 200, { 'Set-Cookie': cookieHeader(await makeSession(env, s), SESSION_DAYS * 86400) });
  }
  if (path === '/logout') return json({ backend: 'worker', ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });

  const staff = await readSession(env, req);
  if (path === '/me') return staff ? json({ backend: 'worker', name: staff.name }) : json({ backend: 'worker', login: true }, 401);
  if (!staff) return json({ backend: 'worker', error: 'Chưa đăng nhập.' }, 401);

  if (path === '/init' && req.method === 'GET') return json(await apiInit(env, staff));
  if (path === '/customer' && req.method === 'POST') return json(await apiCreateCustomer(env, await req.json()));
  if (path === '/order' && req.method === 'POST') return json(await apiCreateOrder(env, staff, await req.json()));
  if (path === '/orders' && req.method === 'GET') return json(await apiListOrders(env));
  const m = path.match(/^\/order\/(rec[\w]+)$/);
  if (m && req.method === 'GET') return json(await readBack(env, m[1]));
  if (m && req.method === 'PATCH') return json(await apiUpdateOrder(env, m[1], await req.json()));
  return json({ error: 'Không có đường dẫn này.' }, 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(req, env, url);
      } catch (e) {
        const user = e instanceof UserError;
        if (!user) console.error(e && e.stack ? e.stack : e);
        return json({ error: e && e.message ? e.message : String(e) }, user ? 400 : 500);
      }
    }
    // tiện ích Lark (cách 1) không dùng ở đây
    if (/^\/(data-lark\.js|sdk\/)/.test(url.pathname)) return new Response('Not found', { status: 404 });
    const res = await env.ASSETS.fetch(req);
    const h = new Headers(res.headers);
    h.set('Cache-Control', 'no-cache');
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('Referrer-Policy', 'same-origin');
    return new Response(res.body, { status: res.status, headers: h });
  },
};

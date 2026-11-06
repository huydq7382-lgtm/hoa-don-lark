// Lớp dữ liệu — cách 2: web app riêng trên Cloudflare Worker (/api/*).
// Cùng các hàm như data-lark.js nên app.js không cần biết đang chạy kiểu nào.

export const mode = 'worker';

async function call(method, path, body) {
  const r = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let d = null;
  try { d = await r.json(); } catch (_) {}
  if (r.status === 401) {
    const e = new Error((d && d.error) || 'Phiên đăng nhập đã hết, Sếp nhập lại mã.');
    e.auth = true;
    throw e;
  }
  if (!r.ok) throw new Error((d && d.error) || 'Máy chủ lỗi ' + r.status);
  return d;
}

// trả về {name} nếu đã đăng nhập, null nếu chưa; ném lỗi nếu không phải máy chủ hoá đơn
export async function probe() {
  const r = await fetch('/api/me', { credentials: 'same-origin' });
  const d = await r.json().catch(() => null);
  if (!d || d.backend !== 'worker') throw new Error('not-worker');
  return r.ok ? d : null;
}
export const login = (code) => call('POST', '/login', { code });
export const logout = () => call('POST', '/logout');

export const init = () => call('GET', '/init');
export const createCustomer = (c) => call('POST', '/customer', c);
export const createOrder = (p) => call('POST', '/order', p);
export const loadOrder = (id) => call('GET', '/order/' + encodeURIComponent(id));
export const updateOrder = (id, before, after) => call('PATCH', '/order/' + encodeURIComponent(id), { before, after });
export const listOrders = () => call('GET', '/orders');

export async function getTheme() { return null; }
export function onTheme() {}
export async function getSelectedOrderId() { return null; }
export function onSelection() {}
export async function toast() {}

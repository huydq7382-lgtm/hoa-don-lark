// Lớp dữ liệu GIẢ — dùng khi mở link ngoài Lark để xem thử giao diện. Không ghi đi đâu cả.

export const mode = 'demo';

const products = [
  ['Gói Nụ cười - 999', 999000, 'Chụp bé'],
  ['Gói Giấc mơ - 1468', 1468000, 'Chụp bé'],
  ['Ký ức - 668', 668000, 'Chụp bé'],
  ['Chụp GĐ 1 concept 1968', 1968000, 'Chụp gia đình'],
  ['Chụp mẹ & bé', 1500000, 'Chụp gia đình'],
  ['Chụp ảnh bầu', 1800000, 'Bầu'],
  ['Chụp beauty', 1700000, 'Beauty'],
  ['Combo 1 ảnh cổng', 3500000, 'Chụp Ảnh Cổng'],
  ['Album Pre Studio', 6500000, 'Chụp Album Pre Wedding'],
  ['Chụp lễ + tiệc trưa', 3800000, 'Chụp lễ/ tiệc'],
  ['Makeup dâu', 2000000, 'MakeUp'],
  ['Takecare tiệc 2 váy', 1000000, 'MakeUp'],
  ['Váy đi bàn cao cấp', 2500000, 'Cho thuê váy'],
  ['Phụ phí đi lại 200', 200000, 'Phụ phí đi lại'],
].map(([name, price, cat]) => ({ name, price, cat }));

const inAn = [
  ['Gỗ lụa 20x30', 120000], ['Gỗ lụa 25x35', 180000], ['Tráng gương titan 15x21', 150000], ['Tráng gương titan 40x60', 500000],
].map(([name, price]) => ({ name, price }));

const customers = [
  { id: 'demo1', label: 'Khách Mẫu A | KH0001', phone: '0900000001', src: 'FP SN Studio' },
  { id: 'demo2', label: 'Khách Mẫu B | KH0002', phone: '0900000002', src: 'Tiktok' },
  { id: 'demo3', label: 'Khách Mẫu C | KH0003', phone: '0900000003', src: 'Zalo SN' },
];
const sources = ['FP SN Studio', 'Tiktok', 'Offline Cửa Hàng', 'FP SN Bé - GĐ', 'FP SN Makeup', 'FB Sương Nguyễn', 'Hotline', 'Zalo SN', 'FP Beauty Concept'];

let seq = 0;
const store = new Map();
const total = (p) => p.items.reduce((s, it) => s + (it.name ? it.price || 0 : 0), 0)
  + (p.phuThu.amount || 0) + (p.inAn.name ? (inAn.find((x) => x.name === p.inAn.name)?.price || 0) * (p.inAn.qty || 0) : 0)
  - (p.chietKhau || 0);

export async function init() {
  return { products, inAn, customers, sources, phanLoai: ['GÓI CHỤP', 'Combo'], userName: 'Người dùng thử' };
}
export async function getTheme() { return null; }
export function onTheme() {}
export async function getSelectedOrderId() { return null; }
export function onSelection() {}
export async function createCustomer({ name, phone, src }) {
  const c = { id: 'demoC' + (++seq), label: `${name} | KH-THỬ`, phone: phone || '', src: src || '' };
  customers.push(c);
  return c;
}
export async function createOrder(p) {
  const id = 'demoR' + (++seq);
  const soHD = 'HD-THỬ-' + String(seq).padStart(2, '0');
  store.set(id, { soHD, payload: JSON.parse(JSON.stringify(p)) });
  return { recordId: id, soHD, total: total(p), seller: 'Người dùng thử', payload: p };
}
export async function loadOrder(id) {
  const r = store.get(id);
  return { recordId: id, soHD: r.soHD, total: total(r.payload), seller: 'Người dùng thử', payload: r.payload };
}
export async function updateOrder(id, before, after) {
  const r = store.get(id);
  r.payload = JSON.parse(JSON.stringify(after));
  return { recordId: id, soHD: r.soHD, total: total(after), seller: 'Người dùng thử', payload: after, changedCount: 1 };
}
export async function toast() {}

/**
 * Demo dataset for the in-app mock backend.
 *
 * The payload shapes mirror the `Moyaser` Mockoon environment one-for-one, so a
 * component that works here works unchanged against the real Mockoon server.
 * Everything is generated from a fixed seed, which keeps the public demo link
 * showing the same numbers on every visit.
 */

/** Deterministic pseudo-random generator (mulberry32) so the demo never shuffles. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seeded(20260910);
const pick = <T>(list: T[]): T => list[Math.floor(rand() * list.length)];
const between = (min: number, max: number): number =>
  Math.floor(rand() * (max - min + 1)) + min;

/** Status groups — same buckets the orders list uses for its tabs. */
export const STATUS_GROUPS: Record<string, string[]> = {
  pending: ['1', '2', '6', '8', '10', '12', '13', '14', '15', '17', '18', '19'],
  failed: ['4', '5', '11', '16'],
  delivered: ['9', '3'],
  shipped: ['7'],
};

/** Badge colours per status code, matching the palette the backend sends. */
const STATUS_COLORS: Record<string, { color: string; text_color: string; class: string }> = {
  delivered: { color: '13deb9', text_color: 'ffffff', class: 'badge badge-success' },
  shipped: { color: '539bff', text_color: 'ffffff', class: 'badge badge-info' },
  failed: { color: 'fa896b', text_color: 'ffffff', class: 'badge badge-danger' },
  pending: { color: 'ffae1f', text_color: 'ffffff', class: 'badge badge-warning' },
};

export function groupOfStatus(status: string): string {
  return (
    Object.keys(STATUS_GROUPS).find((group) => STATUS_GROUPS[group].includes(status)) ?? 'pending'
  );
}

function colorOfStatus(status: string) {
  return STATUS_COLORS[groupOfStatus(status)];
}

/** Cities and areas — copied verbatim from the Mockoon `logistics/cities` response. */
export const CITIES = [
  {
    id: '1', name_en: 'Cairo', name_ar: 'القاهرة', shipping_cost: 50, delivery_time: '1-2 أيام',
    areas: [
      { id: 101, name_en: 'Nasr City', name_ar: 'مدينة نصر', shipping_cost: 50, is_active: true },
      { id: 102, name_en: 'Maadi', name_ar: 'المعادي', shipping_cost: 55, is_active: true },
      { id: 103, name_en: 'Heliopolis', name_ar: 'مصر الجديدة', shipping_cost: 50, is_active: true },
      { id: 104, name_en: 'Downtown', name_ar: 'وسط البلد', shipping_cost: 45, is_active: false },
      { id: 105, name_en: 'October 6th', name_ar: 'السادس من أكتوبر', shipping_cost: 70, is_active: true },
    ],
  },
  {
    id: '2', name_en: 'Alexandria', name_ar: 'الإسكندرية', shipping_cost: 75, delivery_time: '2-3 أيام',
    areas: [
      { id: 201, name_en: 'Smouha', name_ar: 'سموحة', shipping_cost: 70, is_active: true },
      { id: 202, name_en: 'Stanley', name_ar: 'ستانلي', shipping_cost: 75, is_active: true },
      { id: 203, name_en: 'Montaza', name_ar: 'المنتزه', shipping_cost: 80, is_active: false },
      { id: 204, name_en: 'Borg El Arab', name_ar: 'برج العرب', shipping_cost: 90, is_active: true },
    ],
  },
  {
    id: '3', name_en: 'Giza', name_ar: 'الجيزة', shipping_cost: 50, delivery_time: '1-2 أيام',
    areas: [
      { id: 301, name_en: 'Dokki', name_ar: 'الدقي', shipping_cost: 45, is_active: true },
      { id: 302, name_en: 'Mohandessin', name_ar: 'المهندسين', shipping_cost: 45, is_active: true },
      { id: 303, name_en: 'Haram', name_ar: 'الهرم', shipping_cost: 55, is_active: true },
      { id: 304, name_en: 'Sheikh Zayed', name_ar: 'الشيخ زايد', shipping_cost: 65, is_active: true },
    ],
  },
  {
    id: '4', name_en: 'Port Said', name_ar: 'بورسعيد', shipping_cost: 85, delivery_time: '3-4 أيام',
    areas: [
      { id: 401, name_en: 'Al Manakh', name_ar: 'المناخ', shipping_cost: 80, is_active: true },
      { id: 402, name_en: 'Al Arab', name_ar: 'العرب', shipping_cost: 85, is_active: false },
    ],
  },
  {
    id: '5', name_en: 'Aswan', name_ar: 'أسوان', shipping_cost: 120, delivery_time: '4-5 أيام',
    areas: [
      { id: 501, name_en: 'Corniche', name_ar: 'الكورنيش', shipping_cost: 120, is_active: true },
      { id: 502, name_en: 'Elephantine', name_ar: 'الفنتين', shipping_cost: 130, is_active: true },
    ],
  },
  {
    id: '6', name_en: 'Luxor', name_ar: 'الأقصر', shipping_cost: 110, delivery_time: '4-5 أيام',
    areas: [
      { id: 601, name_en: 'East Bank', name_ar: 'الضفة الشرقية', shipping_cost: 110, is_active: true },
      { id: 602, name_en: 'West Bank', name_ar: 'الضفة الغربية', shipping_cost: 115, is_active: true },
    ],
  },
];

const PRODUCT_SEED = [
  { name: 'سوت چيب 3 قطع', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/SZY17787/h3x8nkQ626FiGRFjiNngXZMiRXYVz9Kguu2YlDZQ.jpg' },
  { name: 'غسول الوجه الرغوي المنقي Gravity', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/SZY17787/HStsJQktkllwZp49Ilg3M1nQvewG5E7p9dYBsW1r.jpg' },
  { name: 'ماكينة حلاقة VGR V-071', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/SZY17787/gEb4VwtDkqUBLWm5x05qndTGoUWPrd9X2C32UdLY.jpg' },
  { name: 'بندقية خرز AK', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/XBN2491/wzy5IkG4gS8blCJVuUMflyZR9It5KIjxVOsGWaUn.jpg' },
  { name: 'طقم أواني تيفال 10 قطع', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/SZY17787/UnXeJfcanWlfNcf45VP7zKjzAM2c5VDyDYYClLw1.jpg' },
  { name: 'ساعة يد رجالي كلاسيك', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/XBN2491/N4PXsRQkropZ7BaB21orNzp6vyZUWYaqaGILCN1F.jpg' },
  { name: 'سماعة بلوتوث لاسلكية', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/SZY17787/h3x8nkQ626FiGRFjiNngXZMiRXYVz9Kguu2YlDZQ.jpg' },
  { name: 'مكواة شعر سيراميك', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/SZY17787/HStsJQktkllwZp49Ilg3M1nQvewG5E7p9dYBsW1r.jpg' },
  { name: 'حقيبة ظهر مقاومة للماء', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/SZY17787/gEb4VwtDkqUBLWm5x05qndTGoUWPrd9X2C32UdLY.jpg' },
  { name: 'كريم مرطب بفيتامين C', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/XBN2491/wzy5IkG4gS8blCJVuUMflyZR9It5KIjxVOsGWaUn.jpg' },
  { name: 'شاحن سريع 65 وات', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/SZY17787/UnXeJfcanWlfNcf45VP7zKjzAM2c5VDyDYYClLw1.jpg' },
  { name: 'مجموعة عطور مصغرة', image: 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/XBN2491/N4PXsRQkropZ7BaB21orNzp6vyZUWYaqaGILCN1F.jpg' },
];

const DEPOTS = [
  { id: 1, name: 'المخزن الرئيسي' },
  { id: 2, name: 'مخزن الإسكندرية' },
  { id: 3, name: 'مخزن الصعيد' },
];

export interface MockProduct {
  id: number;
  name: string;
  image: string;
  price: number;
  stock: number;
  warning_stock_number: number;
  display_stock: boolean;
  bonus: number;
  net_commission: number;
  favorite: boolean;
  status: string;
  depot: { id: number; name: string };
  offers: unknown[];
}

/** 36 products built from the seed list, so paging and filters have something to chew on. */
export const PRODUCTS: MockProduct[] = Array.from({ length: 36 }, (_, index) => {
  const seed = PRODUCT_SEED[index % PRODUCT_SEED.length];
  const stock = between(0, 140);
  const warning = 15;
  const price = between(90, 1450);
  return {
    id: index + 1,
    name: index < PRODUCT_SEED.length ? seed.name : `${seed.name} - إصدار ${Math.floor(index / PRODUCT_SEED.length) + 1}`,
    image: seed.image,
    price,
    stock,
    warning_stock_number: warning,
    display_stock: true,
    bonus: between(0, 8),
    net_commission: between(10, 90),
    favorite: rand() > 0.75,
    status: stock === 0 ? 'out_of_stock' : stock <= warning ? 'low_stock' : 'in_stock',
    depot: pick(DEPOTS),
    offers: [],
  };
});

const CUSTOMER_NAMES = [
  'رضا محمد هاشم', 'أحمد صفار', 'منى عبد الرحمن', 'كريم السيد', 'هبة فتحي',
  'محمود الشناوي', 'سارة عادل', 'عمرو زكي', 'نورهان مصطفى', 'يوسف الجندي',
  'دينا حلمي', 'طارق عبد العزيز', 'مريم شعبان', 'إسلام بدر', 'شيماء رمضان',
];

const STORES = ['Online Store', 'Facebook Shop', 'Instagram', 'WhatsApp', 'Call Center'];

/** Short store prefix, matching the `order_code` the backend returns. */
const ORDER_PREFIXES = ['EGY', 'PCA', 'ALX', 'RRQ'];

export interface MockOrder {
  id: number;
  Name: string;
  Phone: string;
  order_code: string;
  status: string;
  date: string;
  city: { id: number; city_name: string; default_price: number };
  area: { id: number; Name: string; name_ar: string; price: number };
  Exchange: string | null;
  status_color: { color: string; text_color: string; class: string };
  Address: string;
  store: string;
  notes: string | null;
  collected: string | null;
  confirm_attempted: number;
  items: MockOrderItem[];
  /** Derived financials — the reports screen aggregates these. */
  goods_total: number;
  shipping_cost: number;
  commission: number;
  net_profit: number;
  /** Days between creation and delivery; null while the order is still moving. */
  delivery_days: number | null;
}

export interface MockOrderItem {
  id: number;
  product_id: number;
  product_name: string;
  image: string;
  quantity: number;
  option: string;
  status: string;
  status_code: number;
  rate: number;
  commission: number;
  price_effect: number;
  bonus: number;
  amount: number;
  total: number;
}

const OPTIONS = ['XL-43', 'L-41', 'M-39', 'مقاس واحد', 'أحمر', 'أسود'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** The demo clock. Orders are spread across the 90 days before this date. */
export const TODAY = new Date();
TODAY.setHours(12, 0, 0, 0);

const ALL_STATUSES = Object.values(STATUS_GROUPS).flat();

/**
 * Weighted status draw: most orders land in a healthy state so the reports read
 * like a real operation rather than uniform noise.
 */
function drawStatus(daysAgo: number): string {
  // Recent orders are still early in the pipeline; older ones have settled.
  const roll = rand();
  if (daysAgo < 3) {
    return roll < 0.55 ? pick(STATUS_GROUPS['pending']) : pick(STATUS_GROUPS['shipped']);
  }
  if (roll < 0.58) return pick(STATUS_GROUPS['delivered']);
  if (roll < 0.75) return pick(STATUS_GROUPS['shipped']);
  if (roll < 0.87) return pick(STATUS_GROUPS['pending']);
  return pick(STATUS_GROUPS['failed']);
}

function buildOrder(index: number, daysAgo: number): MockOrder {
  const created = new Date(TODAY.getTime() - daysAgo * DAY_MS);
  // Spread orders through the working day rather than stacking them at noon.
  created.setHours(between(9, 21), between(0, 59), 0, 0);
  const city = pick(CITIES);
  const area = pick(city.areas);
  const status = drawStatus(daysAgo);
  const group = groupOfStatus(status);

  const itemCount = between(1, 3);
  const items: MockOrderItem[] = Array.from({ length: itemCount }, (_, i) => {
    const product = pick(PRODUCTS);
    const quantity = between(1, 3);
    const rate = product.price;
    return {
      id: 4200000 + index * 10 + i,
      product_id: product.id,
      product_name: product.name,
      image: product.image,
      quantity,
      option: pick(OPTIONS),
      status: status,
      status_code: Number(status),
      rate,
      commission: product.net_commission,
      price_effect: 0,
      bonus: product.bonus,
      amount: rate * quantity,
      total: rate * quantity,
    };
  });

  const goodsTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const commission = items.reduce((sum, item) => sum + item.commission * item.quantity, 0);
  const shipping = area.shipping_cost;

  return {
    id: 1000000 + index,
    Name: pick(CUSTOMER_NAMES),
    Phone: `011${between(10000000, 99999999)}`,
    order_code: pick(ORDER_PREFIXES),
    status,
    date: created.toISOString(),
    city: { id: Number(city.id), city_name: city.name_ar, default_price: city.shipping_cost },
    area: { id: area.id, Name: area.name_en, name_ar: area.name_ar, price: area.shipping_cost },
    Exchange: rand() > 0.94 ? 'استبدال' : null,
    status_color: colorOfStatus(status),
    Address: `${area.name_ar} - ${city.name_ar}`,
    store: pick(STORES),
    notes: rand() > 0.8 ? 'العميل يفضل التسليم بعد الخامسة مساءً' : null,
    collected: group === 'delivered' ? (goodsTotal + shipping).toString() : null,
    confirm_attempted: between(0, 3),
    items,
    goods_total: goodsTotal,
    shipping_cost: shipping,
    commission,
    net_profit: group === 'delivered' ? commission : group === 'failed' ? -shipping : 0,
    delivery_days: group === 'delivered' ? between(1, 6) : null,
  };
}

/**
 * Daily order volume across the 90-day window: a gentle upward trend, a weekly
 * Friday dip, and some noise — so the charts read like a real operation instead
 * of a random scatter.
 */
function ordersPerDay(daysAgo: number): number {
  const growth = 1 + (90 - daysAgo) / 90; // ~1x at the start of the window, ~2x today
  const base = 5 * growth;
  const weekday = new Date(TODAY.getTime() - daysAgo * DAY_MS).getDay();
  const weekly = weekday === 5 ? 0.55 : weekday === 6 ? 0.8 : 1; // Friday is the slow day
  const noise = 0.75 + rand() * 0.5;
  return Math.max(1, Math.round(base * weekly * noise));
}

/** The order book the whole demo reads from, newest first. */
export const ORDERS: MockOrder[] = (() => {
  const orders: MockOrder[] = [];
  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    const count = ordersPerDay(daysAgo);
    for (let i = 0; i < count; i++) orders.push(buildOrder(orders.length, daysAgo));
  }
  return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
})();

export function statusCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const status of ALL_STATUSES) counts[status] = 0;
  for (const order of ORDERS) counts[order.status] = (counts[order.status] ?? 0) + 1;
  return counts;
}

/** `YYYY-MM-DD` in local time — the key every report groups days by. */
export function dayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

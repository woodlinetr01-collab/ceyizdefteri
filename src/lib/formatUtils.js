// Tarih / para birimi biçimlendirme ve hesaplama yardımcıları.
// Not: Para birimi şu an TL olarak sabit; ileride çoklu para birimi eklemek
// isterseniz yalnızca burayı (fmtMoney) genişletmeniz yeterli olacak şekilde
// tasarlandı.

let __uidc = 0;
export const uid = (p = "id") =>
  `${p}_${Date.now().toString(36)}_${(++__uidc).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const nowIso = () => new Date().toISOString();

export const fmtTL = (n) => {
  const v = Math.round(n || 0);
  return `${new Intl.NumberFormat("tr-TR").format(v)} ₺`;
};
export const fmtTLSigned = (n) => `${n < 0 ? "−" : "+"}${fmtTL(Math.abs(n))}`;
export const fmtPct = (n) => `%${Math.round(n)}`;

const pad2 = (n) => String(n).padStart(2, "0");
export const toDate = (s) => new Date(`${s}T00:00:00`);
export const fromDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const fmtDate = (s) => {
  if (!s) return "-";
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
};
export const fmtDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${fmtDate(fromDate(d))} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const monthKey = (s) => s.slice(0, 7);
export const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_TR_LOCAL[m - 1]} ${y}`;
};
export const monthLabelShort = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_TR_LOCAL[m - 1].slice(0, 3)} '${String(y).slice(2)}`;
};
const MONTHS_TR_LOCAL = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export const addMonthsToDate = (dateStr, n) => {
  const d = toDate(dateStr);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return fromDate(d);
};
export const addDaysToDate = (dateStr, n) => {
  const d = toDate(dateStr);
  d.setDate(d.getDate() + n);
  return fromDate(d);
};
export const addYearsToDate = (dateStr, n) => {
  const d = toDate(dateStr);
  d.setFullYear(d.getFullYear() + n);
  return fromDate(d);
};
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
export const shiftMonthKey = (key, n) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};
export const todayIso = () => fromDate(new Date());

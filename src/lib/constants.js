// Kategoriler, ödeme yöntemleri ve diğer sabitler — tüm uygulamada tek kaynak.

export const CATEGORIES = [
  { key: "salon", label: "Düğün Salonu", group: "dugun" },
  { key: "gelinlik", label: "Gelinlik", group: "dugun" },
  { key: "damatlik", label: "Damatlık", group: "dugun" },
  { key: "fotografci", label: "Fotoğraf / Video", group: "dugun" },
  { key: "kuafor", label: "Kuaför / Makyaj", group: "dugun" },
  { key: "davetiye", label: "Davetiye", group: "dugun" },
  { key: "cicek", label: "Çiçek", group: "dugun" },
  { key: "organizasyon", label: "Organizasyon", group: "dugun" },
  { key: "muzik", label: "Müzik", group: "dugun" },
  { key: "nikah", label: "Nikah", group: "dugun" },
  { key: "balayi", label: "Balayı", group: "dugun" },
  { key: "konaklama", label: "Konaklama", group: "dugun" },
  { key: "mobilya", label: "Mobilya", group: "ev" },
  { key: "beyaz_esya", label: "Beyaz Eşya", group: "ev" },
  { key: "elektronik", label: "Elektronik", group: "ev" },
  { key: "mutfak", label: "Mutfak", group: "ev" },
  { key: "banyo", label: "Banyo", group: "ev" },
  { key: "kucuk_ev_aletleri", label: "Küçük Ev Aletleri", group: "ev" },
  { key: "dekorasyon", label: "Dekorasyon / Aydınlatma", group: "ev" },
  { key: "kira", label: "Kira", group: "diger" },
  { key: "fatura", label: "Fatura", group: "diger" },
  { key: "ulasim", label: "Ulaşım", group: "diger" },
  { key: "yemek", label: "Yemek / Market", group: "diger" },
  { key: "diger", label: "Diğer", group: "diger" },
];
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export const HOME_ROOMS = [
  { key: "salon", label: "Salon" },
  { key: "yatak_odasi", label: "Yatak Odası" },
  { key: "mutfak", label: "Mutfak" },
  { key: "banyo", label: "Banyo" },
  { key: "antre", label: "Antre" },
  { key: "balkon", label: "Balkon" },
  { key: "elektronik", label: "Elektronik" },
  { key: "kucuk_ev_aletleri", label: "Küçük Ev Aletleri" },
  { key: "dekorasyon", label: "Dekorasyon" },
  { key: "diger", label: "Diğer" },
];

export const CATEGORY_PALETTE = [
  "#1E7A5C", "#B6862F", "#3E6C9E", "#B5423A", "#6B5B95", "#3C8C7A",
  "#C08A2E", "#7C9E3E", "#9E5B3E", "#4E7FA6", "#8C4E6B", "#5C6B8C",
];
export const catColor = (key) => {
  const idx = CATEGORIES.findIndex((c) => c.key === key);
  return CATEGORY_PALETTE[(idx < 0 ? 0 : idx) % CATEGORY_PALETTE.length];
};

export const PAYMENT_METHODS = ["Nakit", "Banka Havalesi", "Kredi Kartı", "Banka Kartı", "Diğer"];
export const INCOME_SOURCES = ["Maaş", "Ek Gelir", "Prim", "Bonus", "Aile Desteği", "Diğer"];
export const BANK_PRESETS = ["Garanti BBVA", "Akbank", "Yapı Kredi", "İş Bankası", "Ziraat Bankası", "Halkbank", "VakıfBank", "QNB Finansbank", "Denizbank", "TEB", "ING", "Diğer"];
export const CARD_NAME_PRESETS = ["Bonus", "World", "Maximum", "Axess", "Diğer"];
export const CARD_COLORS = [
  { key: "ink", label: "Lacivert", value: "#152238" },
  { key: "gold", label: "Altın", value: "#8A6A24" },
  { key: "emerald", label: "Zümrüt", value: "#155A44" },
  { key: "rose", label: "Bordo", value: "#7A2E27" },
  { key: "sky", label: "Mavi", value: "#2C4D73" },
  { key: "plum", label: "Mor", value: "#4A3866" },
];
export const CURRENCIES = [{ code: "TRY", label: "₺ Türk Lirası" }, { code: "USD", label: "$ Amerikan Doları" }, { code: "EUR", label: "€ Euro" }];
export const PERIODS = [
  { key: "aylik", label: "Aylık" },
  { key: "haftalik", label: "Haftalık" },
  { key: "3aylik", label: "3 Aylık" },
];
export const RECURRING_FREQUENCIES = [
  { key: "monthly", label: "Aylık" },
  { key: "weekly", label: "Haftalık" },
  { key: "yearly", label: "Yıllık" },
  { key: "custom", label: "Özel Aralık (gün)" },
];
export const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export const INSTALLMENT_STATUS = { WAITING: "bekliyor", PAID: "odendi", LATE: "gecikti", CANCELLED: "iptal" };
export const DEBT_STATUS = { WAITING: "Bekliyor", PARTIAL: "Kısmen Ödendi", DONE: "Tamamlandı" };
export const WHO_ADDED = { ME: "me", PARTNER: "partner", SHARED: "shared" };

// Ücretsiz plan sınırları — tek kaynaktan yönetilir (bkz. services/premium.js)
export const FREE_LIMITS = {
  maxTransactions: 60,
  maxInstallmentPlans: 5,
  maxBudgetModules: 2, // düğün + ev
  coupleAccount: false,
  aiAssistant: false,
  exportPdfExcel: false,
  statementImport: false,
};

export const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

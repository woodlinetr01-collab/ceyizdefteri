// Basit, bağımlılıksız i18n katmanı. Yeni bir dil eklemek için:
//   1) src/lib/locales/<kod>.json oluşturun (tr.json'daki anahtarlarla aynı)
//   2) LOCALES nesnesine ekleyin.
// Şu an yalnızca Türkçe arayüz metinleri tamamlanmıştır; İngilizce iskelet
// halindedir (madde 52 — Almanca için de aynı desen izlenebilir).

import tr from "./locales/tr.json";
import en from "./locales/en.json";

export const LOCALES = { tr, en };
export const DEFAULT_LOCALE = "tr";

export function t(key, locale = DEFAULT_LOCALE) {
  return LOCALES[locale]?.[key] ?? LOCALES[DEFAULT_LOCALE]?.[key] ?? key;
}

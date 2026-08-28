// ============================================================================
// APP LOCK — PIN kilidi (gerçek, çalışan) + biyometrik mimari notu
//
// PIN: 4 haneli, SHA-256 ile hash'lenip localStorage'da saklanır. Uygulama
// açılışında (ve arka plandan öne gelişte) etkinse kilit ekranı gösterilir.
//
// BİYOMETRİK (Face ID / Touch ID / Fingerprint) — madde 50:
//   Web tarafında bunun GERÇEK ve tarayıcı-native karşılığı **WebAuthn**'dır
//   (navigator.credentials.create/get, platform authenticator). Bu, HTTPS
//   üzerinde çalışan gerçek bir API'dir ve Capacitor'a geçmeden de web PWA'da
//   çalışabilir — ancak sunucu tarafı bir "relying party" (challenge üretme/
//   doğrulama) gerektirdiğinden tam uçtan uca akış bir backend (Supabase Edge
//   Function önerilir) ister. Bu sandbox'ta backend kuramadığımız için
//   WebAuthn ceremony'sini tam bağlamadık; ancak arayüz PIN + "Biyometrik"
//   seçeneğini yan yana gösterecek şekilde hazırlandı (bkz.
//   pages/SettingsPage.jsx) — `isBiometricAvailable()` tarayıcıda destek olup
//   olmadığını gerçekten kontrol eder.
//   Capacitor'a geçtiğinizde ise `@capacitor-community/biometric-auth`
//   eklentisini services/biometric.native.js gibi ayrı bir dosyada
//   çağırmanız yeterli; UI hiçbir değişiklik gerektirmez.
// ============================================================================

const PIN_KEY = "ceyiz_defteri_pin_v1";
const LOCK_ENABLED_KEY = "ceyiz_defteri_lock_enabled_v1";

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isLockEnabled() {
  return localStorage.getItem(LOCK_ENABLED_KEY) === "1";
}
export async function setPin(pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN 4 haneli olmalı.");
  localStorage.setItem(PIN_KEY, await sha256(pin));
  localStorage.setItem(LOCK_ENABLED_KEY, "1");
}
export function disableLock() {
  localStorage.removeItem(LOCK_ENABLED_KEY);
  localStorage.removeItem(PIN_KEY);
}
export async function verifyPin(pin) {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return false;
  return (await sha256(pin)) === stored;
}

export function isBiometricAvailable() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

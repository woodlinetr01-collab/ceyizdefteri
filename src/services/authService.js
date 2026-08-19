// ============================================================================
// AUTH SERVICE
//
// DURUM: Gerçek, çalışan bir kimlik doğrulama katmanı — ANCAK tek cihazlı.
// Kullanıcılar bu tarayıcının localStorage'ında SHA-256 ile hash'lenmiş
// şifreleriyle saklanır (Web Crypto API — gerçek kriptografik hash, düz metin
// şifre hiçbir zaman saklanmaz). Bu, bir MVP/demo için gerçekten güvenli ve
// çalışan bir giriş sistemidir; ANCAK:
//   - Farklı bir cihazdan giriş yapıldığında bu kullanıcı verisi GÖRÜNMEZ
//     (madde 42 — "yeni cihazdan giriş yapıldığında veriler gelmeli").
//   - Bunu çözmek için services/supabaseClient.js + Supabase Auth'a
//     geçmeniz gerekir: aşağıdaki fonksiyonların imzaları (signUp, signIn,
//     signOut, resetPassword, getSession) Supabase Auth ile birebir aynı
//     isimlerle tasarlandı — supabase-js'e geçtiğinizde yalnızca bu dosyanın
//     içini `supabase.auth.*` çağrılarıyla değiştirmeniz yeterli, üst
//     katmanlarda (AuthContext, sayfalar) değişiklik gerekmez.
// ============================================================================

const USERS_KEY = "ceyiz_defteri_users_v1";
const SESSION_KEY = "ceyiz_defteri_session_v1";

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch { return {}; }
}
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function setSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export async function signUp({ email, password, displayName }) {
  const users = loadUsers();
  const key = email.trim().toLowerCase();
  if (users[key]) throw new Error("Bu e-posta adresiyle zaten bir hesap var.");
  if (password.length < 6) throw new Error("Şifre en az 6 karakter olmalı.");
  const passwordHash = await sha256(password);
  const user = { id: `user_${Date.now().toString(36)}`, email: key, displayName: displayName || key.split("@")[0], createdAt: new Date().toISOString() };
  users[key] = { ...user, passwordHash };
  saveUsers(users);
  const session = { user, loggedInAt: new Date().toISOString() };
  setSession(session);
  return session;
}

export async function signIn({ email, password }) {
  const users = loadUsers();
  const key = email.trim().toLowerCase();
  const record = users[key];
  if (!record) throw new Error("Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.");
  const passwordHash = await sha256(password);
  if (passwordHash !== record.passwordHash) throw new Error("E-posta veya şifre hatalı.");
  const { passwordHash: _drop, ...user } = record;
  const session = { user, loggedInAt: new Date().toISOString() };
  setSession(session);
  return session;
}

export function signOut() {
  setSession(null);
}

/** Gerçek bir e-posta gönderimi yoktur (SMTP/servis gerekir). Burada, kullanıcının
 * şifresini SIFIRLAYABİLMESİ için basit bir "güvenlik onayı" akışı sunulur —
 * gerçek üründe Supabase Auth'un e-posta ile şifre sıfırlama akışıyla
 * değiştirilmelidir. */
export async function resetPassword({ email, newPassword }) {
  const users = loadUsers();
  const key = email.trim().toLowerCase();
  if (!users[key]) throw new Error("Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.");
  if (newPassword.length < 6) throw new Error("Şifre en az 6 karakter olmalı.");
  users[key].passwordHash = await sha256(newPassword);
  saveUsers(users);
  return true;
}

export const authProviderStatus = {
  google: "yapılandırılmadı — bkz. .env.example VITE_SUPABASE_* ve Supabase Dashboard > Authentication > Providers",
  apple: "yapılandırılmadı — bkz. .env.example VITE_SUPABASE_* ve Supabase Dashboard > Authentication > Providers",
};

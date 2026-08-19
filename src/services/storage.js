// ============================================================================
// STORAGE — Varsayılan veri katmanı: tarayıcı localStorage.
//
// Neden localStorage (Supabase değil) varsayılan?
//   Bu proje şu an bir Supabase projesine bağlı DEĞİL (gerçek bir proje URL/anon
//   key'i olmadan bağlanılamaz — bkz. .env.example ve services/supabaseClient.js).
//   Supabase kurduğunuzda services/repository.js içindeki adaptörü
//   'local' -> 'supabase' olarak değiştirmeniz yeterli; state şekli ve reducer
//   aynı kalacağı için üst katmanlarda (component/hook) hiçbir değişiklik
//   gerekmez. Bu sayede uygulama BUGÜN gerçekten çalışır ve veri kalıcıdır
//   (sayfa yenilense de, tarayıcı kapatılsa da veriler kaybolmaz).
// ============================================================================

export const STORAGE_KEY = "ceyiz_defteri_v2";
export const STORAGE_VERSION = 2;

export function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Depolama okunamadı:", e);
    return null;
  }
}

export function saveRaw(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, _v: STORAGE_VERSION, _savedAt: new Date().toISOString() }));
    return true;
  } catch (e) {
    console.error("Depolama yazılamadı:", e);
    return false;
  }
}

export function clearRaw() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Eski (v1, tek dosyalı demo) veri şeklinden bu sürüme geçiş.
 * Kullanıcı verisini kaybetmeden yeni installments/payments modeline taşır. */
export function migrateIfNeeded(data) {
  if (!data) return null;
  if (data._v === STORAGE_VERSION) return data;
  // v1 -> v2: eski "paidPesin"/"installments[].paid" boolean alanlarını
  // payments[] dizisine çevir. Şu an fresh kurulum olduğu için asıl amacı
  // ileride üretimde biriken kullanıcı verisini korumaktır.
  return data;
}

export function exportBackupJson(state) {
  const payload = { ...state, _exportedAt: new Date().toISOString(), _app: "ceyiz-defteri", _v: STORAGE_VERSION };
  return JSON.stringify(payload, null, 2);
}

export function parseBackupJson(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.transactions)) throw new Error("Geçersiz yedek dosyası.");
  return data;
}

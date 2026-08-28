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
export const STORAGE_VERSION = 3;

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

/** Eski sürüm veri şekillerinden bu sürüme geçiş. Kullanıcı verisi ASLA
 * silinmez; yalnızca eksik alanlar geriye dönük uyumlu varsayılanlarla
 * tamamlanır. schemaVersion (_v) alanına göre kademeli olarak uygulanır. */
export function migrateIfNeeded(data) {
  if (!data) return null;
  let out = data;

  // _v yoksa (çok eski/elle oluşturulmuş veri) 2 kabul edilir.
  const fromVersion = out._v || 2;

  if (fromVersion < 3) {
    // v2 -> v3: Krediler (loans) modülü eklendi; kartlara "mevcut borç
    // geçmiş harcamaları içeriyor mu?" bayrağı eklendi. Var olan kartlarda
    // bu bayrak `false` (yani eski davranışla BİREBİR aynı hesap: existingDebt
    // + tüm kart işlemleri) olarak bırakılır ki mevcut kullanıcıların
    // rakamları sürüm geçişinde SESSİZCE değişmesin. Kullanıcı isterse
    // kartı düzenleyip yeni soruyu yanıtlayarak çift sayımı düzeltebilir.
    out = {
      ...out,
      loans: out.loans || [],
      loanInstallments: out.loanInstallments || [],
      cards: (out.cards || []).map((c) => ({
        existingDebtIncludesHistory: false,
        baselineDate: null,
        last4: "",
        color: "",
        description: "",
        ...c,
      })),
      meta: { ...(out.meta || {}), profile: (out.meta && out.meta.profile) || null },
    };
  }

  return { ...out, _v: STORAGE_VERSION };
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

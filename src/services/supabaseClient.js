// ============================================================================
// SUPABASE CLIENT — opsiyonel, ortam değişkenleri girildiğinde aktif olur.
//
// Bu proje BUGÜN Supabase olmadan da tam çalışır (bkz. services/storage.js —
// localStorage). Gerçek bulut senkronizasyonu, çoklu cihaz desteği ve ortak
// hesap (madde 25, 39-44) için:
//
//   1) https://supabase.com üzerinde ücretsiz bir proje oluşturun.
//   2) Proje kökünde `.env` dosyası oluşturun (.env.example'ı kopyalayın) ve
//      VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY değerlerini girin.
//   3) `supabase/schema.sql` dosyasını Supabase SQL Editor'de çalıştırın
//      (tabloları + RLS politikalarını kurar).
//   4) `npm install @supabase/supabase-js` çalıştırın (package.json'da zaten
//      bağımlılık olarak tanımlı).
//   5) services/repository.js içindeki ADAPTER değerini 'local' -> 'supabase'
//      yapın. Üst katmanlar (context/reducer) hiç değişmeden Supabase'e
//      bağlanır çünkü aynı veri şeklini kullanır.
//
// ÖNEMLİ GÜVENLİK NOTU: Yalnızca "anon" (public) key'i frontend'e koyun.
// "service_role" key ASLA frontend koduna veya .env dosyasına (commit
// edilecekse) yazılmamalıdır — yalnızca sunucu tarafı (Edge Function) için
// kullanılır.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // Geliştirici konsolunda tek seferlik, sessiz bilgi notu.
  console.info(
    "[Çeyiz Defteri] Supabase yapılandırılmadı — uygulama localStorage ile çalışıyor. " +
      "Bulut senkronizasyonu için .env.example dosyasına bakın."
  );
}

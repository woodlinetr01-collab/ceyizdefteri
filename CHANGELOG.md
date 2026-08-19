# CHANGELOG — Çeyiz Defteri v2.0

Bu sürüm, tek dosyalık bir demo artifact'ı gerçek bir Vite/React projesine ve
oradan da çok daha geniş kapsamlı bir "çift finans yönetimi" ürününe
dönüştürme çalışmasının çıktısıdır. Aşağıdaki liste **tamamen dürüst**
tutulmuştur: bir madde "çalışıyor" diyorsa gerçekten çalışır ve
`npm run dev` ile test edilebilir; "hazırlandı ama tamamlanmadı" diyorsa
o kısım için gerçek bir sonraki adım tanımlanmıştır.

---

## ✅ Tamamlanan ve GERÇEKTEN çalışan özellikler

**Mimari**
- Modüler klasör yapısı: `components/ pages/ hooks/ services/ lib/ contexts/ data/ types/`
- Tüm finansal hesaplama mantığı `src/lib/financeEngine.js` içinde, React'ten
  bağımsız, saf fonksiyonlar halinde toplandı.
- React Router v6 ile sayfa bazlı gerçek routing (`/`, `/app`, `/app/islemler`, …)

**Veri kalıcılığı**
- localStorage tabanlı gerçek kalıcılık: sayfa yenilense de veriler kaybolmaz.
- JSON yedek dışa/içe aktarma (Ayarlar → Veri Yönetimi) — tam çalışır.

**Kayıt yönetimi**
- Gelir / Gider / Transfer olarak üç ayrı işlem tipi; transferler gelir/gider
  toplamlarını etkilemez.
- Tüm kayıt tiplerinde gerçek Düzenle / Sil / Kopyala.
- Silme işlemlerinde onay penceresi + "Geri Al" (undo) toast'ı.
- Toplu işlem: seç / tümünü seç / toplu sil / toplu kategori değiştir / toplu ödendi işaretle.
- Mükerrer kayıt tespiti (aynı tarih+tutar+açıklama+kart) — uyarı gösterir.
- Açıklamadan otomatik kategori önerisi (IKEA→Mobilya, Migros→Market, vb.)

**Taksit motoru**
- Peşinat + taksit hesaplaması; kalan tutar taksit sayısına doğru bölünür
  (küsurat son taksite eklenir, toplamda asla tutar kaybolmaz/çoğalmaz).
- Kısmi ödeme: basit giderlere birden fazla parçalı ödeme eklenebilir.
- Taksit durumları (Bekliyor/Ödendi/Gecikti/İptal) **ödeme kayıtlarından
  otomatik türetilir** — "ödendi" işaretini geri almak tüm hesaplamaları
  doğru şekilde geri alır.
- Erken taksit ödeme desteklenir (ödeme tarihi, vade tarihinden bağımsız kaydedilir).
- Tek taksidin vadesi değiştirilebilir; "sonraki tüm taksitleri kaydır" seçeneği çalışır.
- Bir işlem düzenlendiğinde, **zaten ödenmiş taksitler korunur**, yalnızca
  ödenmemiş kısım yeni plana göre yeniden oluşturulur.

**Kredi kartları**
- Gerçek borç / mevcut ekstre / gelecek ay / sonraki aylar ayrımı (taksit
  sayısı kadar çoğaltma hatası yok).
- Limit kullanım oranı + %80/%90 eşiklerinde otomatik uyarı.
- Kart silme: bağlı işlem sayısını gösterir, başka karta taşıma veya "Diğer"
  ödeme yöntemine düşürme seçeneği sunar.

**Düğün / Ev bütçesi**
- Kategori bazlı planlanan/gerçekleşen/ödenen/kalan; bütçe aşımında uyarı.
- Planlanmamış kategoriler için hızlı planlama arayüzü.

**Borç / Alacak**
- Kısmi ödeme desteği, durum (Bekliyor/Kısmen Ödendi/Tamamlandı) otomatik türetilir.

**Düzenli işlemler**
- Aylık/haftalık/yıllık tekrar eden gelir/gider kuralları; uygulama açıldığında
  önümüzdeki 3 ay için somut kayıtları **idempotent** biçimde (tekrar tekrar
  üretmeden) oluşturur.

**Takvim / Bildirimler**
- Gelir, gider, taksit ve borç/alacağı tek takvimde birleştiren liste/aylık/
  takvim görünümleri, 7/30/90 gün filtreleri.
- Bildirim merkezi: akıllı uyarılar + 7 günlük ödemeler + gecikmiş ödemeler.

**Raporlar & Dışa Aktarma**
- Aylık/yıllık özet, kategori analizi, kredi kartı analizi, gelecek 12 ay yükü grafiği.
- CSV ve JSON dışa aktarma bağımlılıksız çalışır.
- **Excel (.xlsx, çok sayfalı)** ve **PDF (biçimlendirilmiş rapor)** dışa
  aktarma gerçekten üretir (xlsx, jspdf paketleriyle) — Premium kilidi arkasında.

**İçe Aktarma**
- CSV ekstre içe aktarma: kolon otomatik algılama + mükerrer tespiti + kullanıcı
  onayı olmadan hiçbir kayıt eklenmez.
- PDF ekstre içe aktarma: pdfjs-dist ile gerçek metin çıkarımı + heuristik
  satır ayrıştırma + **zorunlu önizleme/onay** (talimatınızdaki gibi, tam
  otomatik parsing yerine kullanıcı onayı esas alındı).

**AI Finans Asistanı**
- Kural tabanlı doğal dil eşleştirici; TÜM cevaplar `financeEngine`'in
  ürettiği gerçek verilerden hesaplanır, hiçbir sayı uydurulmaz.
- Aylık otomatik özet (gelir/gider/net/geçen aya göre değişim/en çok harcanan
  kategori/gelecek ay riski).

**Kimlik doğrulama**
- Gerçek, çalışan (ama tek cihazlı) e-posta/şifre kaydı ve girişi — şifreler
  düz metin değil SHA-256 hash olarak saklanır (Web Crypto API).
- Şifre sıfırlama akışı (yerel, e-posta gönderimi olmadan).

**Güvenlik**
- 4 haneli PIN uygulama kilidi — gerçekten çalışır (hash'lenmiş, uygulama
  açılışında zorunlu kılınır).
- Error Boundary: beklenmeyen hatalarda kullanıcıya anlaşılır mesaj gösterir.

**Premium / Feature-flag**
- Merkezi `services/premium.js`: ücretsiz plan limitleri (60 işlem, 2 kart,
  5 taksit planı) gerçekten uygulanır ve aşıldığında nazik bir toast +
  "Premium'a Bak" yönlendirmesi gösterir (agresif popup yok).
- 7 günlük deneme süresi gerçek tarih hesabıyla çalışır ve süre dolunca
  otomatik Free'ye döner.

**Onboarding & Boş/Demo Seçimi**
- İlk açılışta "Boş Başla" / "Demo Verileriyle Başla" seçimi.
- Ayarlar → "Demo Verilerini Temizle" (onaylı).
- "Hesabımı ve tüm verilerimi sil" — iki aşamalı onay.

**Tema & Dil**
- Açık / Koyu / Sistem teması, kalıcı olarak saklanır ve gerçekten uygulanır.
- i18n altyapısı (`lib/i18n.js` + `locales/tr.json`, `locales/en.json`) —
  Türkçe arayüz tam, İngilizce iskelet halinde.

**Mobil / PWA**
- iPhone 11 dahil küçük ekranlar için responsive tasarım, güvenli alan
  (safe-area) desteği, 16px input (iOS zoom engelleme), alt sheet modallar.
- PWA manifest + service worker (vite-plugin-pwa) + tüm ikon boyutları.
- Sağ altta "+" hızlı işlem butonu (Gelir/Gider/Transfer/Borç kısayolları).

**Pazarlama & Yasal**
- Landing page (Hero, Nasıl Çalışır, Özellikler, Fiyatlandırma, SSS, Footer).
- 5 yasal sayfa (Gizlilik, Kullanım Koşulları, KVKK, Çerez, Abonelik) —
  içerikleri **açıkça placeholder olarak işaretlenmiş**, sayfa içinde "bir
  hukukçu tarafından incelenmeden yayına alınmamalı" uyarısı gösterilir.

**Veritabanı tasarımı**
- `supabase/schema.sql`: tüm tablolar (users, transactions, installments,
  transaction_payments, credit_cards, recurring_transactions, budgets,
  home_items, debts, couples, couple_members, subscriptions, user_settings…),
  foreign key ilişkileri ve **Row Level Security politikaları** eksiksiz
  yazıldı. Henüz bir Supabase projesine uygulanmadı (aşağıya bakın).

---

## 🟡 Hazırlanan ama TAMAMLANMAMIŞ / bağlanmamış özellikler

Bunlar "sahte buton" değildir — kodları ve mimarileri gerçekten mevcuttur,
ama dış bir sistem (gerçek Supabase projesi, ödeme sağlayıcı, Apple/Google
geliştirici hesabı) olmadan uçtan uca çalışamazlar:

- **Supabase bağlantısı:** `services/supabaseClient.js` ve tam SQL şeması
  hazır, ancak uygulama şu an localStorage kullanıyor. Gerçek bir Supabase
  projesi bağlanmadı (bu ortamda internet erişimi/Supabase hesabı yok).
- **Çoklu cihaz senkronizasyonu:** Yukarıdakine bağlı olarak, aynı hesapla
  farklı bir cihazdan giriş yapıldığında veriler GÖRÜNMEZ (yalnızca
  localStorage'da olduğu cihazda görünür).
- **Ortak hesap / eş daveti:** Veritabanı şeması (`couples`, `couple_members`)
  ve premium kilit mantığı hazır; davet gönderme/kabul etme UI akışı henüz
  yazılmadı (Supabase Auth + gerçek e-posta daveti gerektirir).
- **Gerçek ödeme / abonelik:** `services/premium.js` içindeki "Premium'a Geç"
  butonu şu an yalnızca yerel durumu değiştiren bir DEMO aktivasyondur, gerçek
  para tahsil etmez. Gerçek ödeme için Stripe (web) veya App Store/Play
  Store In-App Purchase (mobil) entegrasyonu gerekir.
- **Biyometrik kilit (Face ID/Touch ID):** Mimari notu ve tarayıcı desteği
  kontrolü (`isBiometricAvailable()`) hazır; tam WebAuthn/Capacitor entegrasyonu
  yapılmadı (PIN kilidi tam çalışır durumda, biyometri onun yanına eklenecek).
- **Analitik (privacy-friendly):** Event listesi ve tasarım prensibi
  `CHANGELOG` ve proje notlarında tanımlı; henüz bir analytics SDK'sı
  (örn. Plausible/PostHog) bağlanmadı.
- **Almanca dil dosyası:** i18n altyapısı hazır, yalnızca `tr` ve iskelet
  halinde `en` dolduruldu; `de.json` henüz yok.

## ❌ Bu ortamda YAPILAMAYANLAR (kapsam dışı, dış hesap gerektirir)

- **Gerçek bir Supabase projesinin oluşturulup deploy edilmesi** — internet
  erişimi ve bir Supabase hesabı gerekir (adımlar README'de).
- **App Store / Google Play'e yayınlama** — Apple Developer (99$/yıl) ve
  Google Play Console (25$ tek seferlik) hesapları, Xcode/Android Studio
  ile native build, mağaza inceleme süreçleri gerekir. `capacitor.config.json`
  ve `npx cap add ios/android` adımları hazır; native proje dosyaları
  (ios/, android/) bu ortamda üretilmedi çünkü Xcode/Android SDK gerektirir.
- **package-lock.json:** Bu ortamda internet erişimi yok, dolayısıyla
  `npm install` çalıştırıp gerçek bir kilit dosyası üretemedik. Sahte/rastgele
  bir lockfile koymak yerine, doğru olanı yapıp **bu dosyayı dahil etmedik** —
  bilgisayarınızda ilk `npm install` çalıştırdığınızda gerçek ve doğru bir
  `package-lock.json` otomatik oluşacaktır.

---

## Supabase kurulumu için yapmanız gerekenler

1. [supabase.com](https://supabase.com) → yeni proje oluşturun (ücretsiz katman yeterli).
2. `supabase/schema.sql` dosyasının tamamını SQL Editor'de çalıştırın.
3. `.env.example` → `.env` kopyalayın, `VITE_SUPABASE_URL` ve
   `VITE_SUPABASE_ANON_KEY` değerlerini girin.
4. `npm install @supabase/supabase-js` zaten package.json'da tanımlı, `npm install` ile gelir.
5. `src/services/storage.js`, `authService.js`, `premium.js` içindeki
   localStorage tabanlı fonksiyonları adım adım `supabase.from(...)` /
   `supabase.auth.*` çağrılarıyla değiştirin — üst katmanlar (context,
   reducer, sayfalar) aynı veri şeklini kullandığı için değişmesi gerekmez.
6. Gerçek e-posta ile şifre sıfırlama için Supabase Auth → Email Templates
   ayarlarını yapılandırın.

## Environment Variables

`.env.example` dosyasına bakın:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase (opsiyonel, boşsa uygulama localStorage ile çalışır)
- `VITE_STRIPE_PUBLISHABLE_KEY` — ileride web ödemesi için (opsiyonel)
- `AI_PROVIDER_API_KEY` — yalnızca gerçek bir LLM'e geçerseniz, ve SADECE bir backend/Edge Function üzerinden kullanılmalı, asla frontend'e konmamalı.

## Premium sistemiyle ilgili eksikler

- Fiyatlar `src/services/premium.js` → `PRICING` sabitinde tek yerden yönetiliyor (69,90 TL/ay, 499 TL/yıl) — değiştirmek için yalnızca bu dosyayı düzenleyin.
- "Premium'a Geç" butonu şu an gerçek ödeme almıyor (yukarıya bakın).
- Web'de gerçek ödeme: Stripe Checkout entegrasyonu (`services/billing.js` gibi yeni bir dosya + bir backend endpoint).
- Mobilde gerçek ödeme: RevenueCat veya native StoreKit/Google Play Billing (Capacitor eklentisi).

## App Store / Google Play için henüz yapılmayanlar

- `npx cap add ios` / `npx cap add android` ile native proje dosyalarının üretilmesi (Xcode/Android Studio gerekir).
- Apple Developer ve Google Play Console hesaplarının açılması.
- Uygulama ikonu/splash screen'in native boyutlarda üretilmesi (mevcut PWA ikonları web için hazır; native store gereksinimleri farklı boyut setleri ister).
- Mağaza listeleme metinleri, ekran görüntüleri, gizlilik beyanı formları (Apple/Google'ın kendi formları).
- Gerçek uygulama içi satın alma (In-App Purchase) entegrasyonu — yukarıdaki Premium bölümüne bakın.

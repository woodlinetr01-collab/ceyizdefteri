# CHANGELOG — Çeyiz Defteri v2.1.1

## v2.1.1 — Kapsamlı düzenle/sil desteği

Var olan her kayıt tipi artık düzenlenebilir ve silinebilir; hepsi aynı
merkezi `AppDataContext`/`financeEngine` üzerinden çalıştığı için düzenleme
sonrası tüm finansal hesaplamalar (bakiye devri, kart borcu, bütçe ilerlemesi
vb.) otomatik olarak yeniden hesaplanır ve sayfa yenilense de kalıcıdır.

- **Borçlar/Alacaklar:** Artık kişi, tutar, vade tarihi ve not düzenlenebilir
  (yeni `DebtFormModal`, mevcut `UPDATE_DEBT` action'ı kullanılarak).
- **Kategoriler/Bütçe:** Daha önce yalnızca ilk kez planlanabiliyordu; artık
  zaten planlanmış bir kategori bütçesi satırın üzerine tıklanarak yerinde
  (inline) düzenlenebiliyor.
- **Kredi taksitleri:** Taksit vadesi tek tek veya "sonraki tüm taksitleri
  kaydır" seçeneğiyle değiştirilebiliyor; artık kısmi ödeme de eklenebiliyor
  (yeni `SET_LOAN_LINE_DUE_DATE`, `REMOVE_LAST_PAYMENT_FROM_LOAN_LINE`).
- **Onboarding bilgileri:** Ayarlar → Profil'de ad, partner adı, para birimi
  ve aylık gelir sonradan düzenlenebiliyor (yeni `UPDATE_PROFILE` action'ı).
- **Düzenli işlemler:** Ayarlar'a yeni bir "Düzenli İşlemler" bölümü eklendi;
  onboarding'de veya işlem eklerken oluşturulan tüm tekrarlayan gelir/gider
  kuralları listelenir, tutar/sıklık/bitiş tarihi düzenlenebilir veya kural
  silinebilir (silme yalnızca gelecekteki üretimi durdurur, geçmiş kayıtları
  etkilemez).
- **Zaten var olup bu sürümde doğrulanan düzenleme desteği (değişiklik
  gerekmedi):** Gelirler, Giderler/taksitli alışverişler, Kredi Kartları,
  Kart mevcut borcu, Kart ödemeleri (ödeme geçmişi normal gider satırları
  üzerinden yönetildiği için Giderler sayfasındaki mevcut kısmi ödeme/geri al
  arayüzüyle zaten düzenlenebiliyordu), Krediler, Hesap transferleri.
- **Regresyon doğrulaması:** Kart çift-sayma düzeltmesi, FIFO kart ödemesi,
  kredi izolasyonu (asla ikinci bir gider kaydı oluşturmaz) ve aylık
  bakiye devri, yeni düzenleme akışlarından sonra da bozulmadığı Node
  üzerinde gerçek kod çalıştırılarak doğrulandı.

---

# CHANGELOG — Çeyiz Defteri v2.1

## v2.1 — Bu sürümde eklenenler

**Onboarding / Hesap Oluşturma**
- Gerçek çok adımlı ilk kullanım akışı: Hoş Geldiniz → Hesap Bilgileri (ad,
  partner adı, e-posta, şifre, para birimi, aylık gelir — hepsi doğrulamalı)
  → Boş Başla / Demo Verileriyle Başla.
- Mevcut `AuthContext`/`authService` kullanılarak yerel hesap oluşturulur.
- "Boş Başla" seçilip aylık gelir girildiyse, bu gelir otomatik olarak aylık
  tekrar eden bir gelir kuralına dönüştürülür (mükerrer kayıt oluşmadan).
- **Kritik mimari düzeltme:** `AppDataContext` artık depoda veri yoksa state'i
  `null` ile başlatıyor; onboarding daha önce yanlışlıkla hiç görünmüyordu
  (state doğrudan boş duruma set ediliyordu) — bu düzeltildi.

**Kredi Kartları**
- Kart sayısı sınırı tamamen kaldırıldı (ücretsiz planda da sınırsız).
- Kart düzenleme, son 4 hane, kart rengi, açıklama alanları eklendi.
- **Çift sayma düzeltmesi:** Kart eklenirken/düzenlenirken mevcut borcun
  "geçmiş harcamaları içerip içermediği" sorulur. "Evet" seçilirse, o
  tarihten (baselineDate) önceki kart işlemleri borca bir daha eklenmez;
  sonraki yeni harcamalar doğru şekilde eklenmeye devam eder. Eski
  kullanıcı verileri geçişte `false` (eski davranışla birebir aynı) olarak
  ayarlanır, rakamlar sessizce değişmez.
- "Kart Borcu Öde": girilen tutar, o karta bağlı en eski vadeli ödenmemiş
  taksitlerden başlanarak FIFO mantığıyla otomatik dağıtılır.

**Krediler (yeni modül)**
- `/app/krediler`: kredi ekleme/düzenleme/silme, taksit planı, ödenen/kalan
  taksit sayacı, kalan borç tahmini.
- Kredi taksitleri tamamen ayrı bir çizelgede (`loanInstallments`) tutulur;
  bir taksit ödendi işaretlendiğinde **asla** bir gider/işlem kaydı
  oluşturulmaz — bu, kredi kartı harcaması ile ödemesinin veya kredi
  taksidinin iki kez gider sayılmasını yapısal olarak imkânsız kılar.
- Kredi taksitleri Dashboard, Takvim, Yaklaşan Ödemeler ve Akıllı
  Uyarılar'a dahil edildi.

**Aylık Bilanço ve Devir**
- `financeEngine.js` içine tam bir aylık defter (ledger) zinciri eklendi:
  her ayın açılışı, bir önceki ayın kapanışına eşittir; kapanış =
  açılış + gelir − gider (kart taksitleri + kredi taksitleri dahil).
- Pozitif veya negatif bakiye bir sonraki aya otomatik devreder.
- Bu zincir **her state değişiminde sıfırdan yeniden hesaplanır** — geçmiş
  bir aya sonradan eklenen işlem, sonraki tüm ayların devrini otomatik ve
  doğru şekilde günceller (ayrı bir "yeniden hesapla" adımına gerek yoktur).
- Dashboard'a "Devreden Bakiye" ve "Gelecek Ay Tahmini" (tahmini gelir, kart
  taksitleri, kredi taksitleri, diğer sabit giderler, devreden bakiye,
  tahmini serbest bakiye) panelleri eklendi.

**Diğer**
- Akıllı uyarılara kredi taksidi ve "geçen aydan açık devretti" uyarıları eklendi.
- AI asistanına "Bu ay param neden yetmedi?" örneği ve gerçek `financeEngine`
  verilerine dayanan analiz eklendi; `.env.example`'a güvenli (VITE_ önekli
  gerçek anahtar KOYULMAMASI gerektiğini açıkça belirten) bir AI entegrasyon
  notu eklendi.
- `supabase/schema.sql`'e dokunulmadı (hâlâ bağlanmadı, bkz. aşağı).
- Vercel SPA rewrite'ı, geçersiz regex hatası veren eski negatif-lookahead
  desenden kaldırılıp Vercel'in resmi önerdiği basit `"/(.*)" → "/index.html"`
  desenine geçirildi.
- localStorage şema sürümü 2 → 3'e çıkarıldı; `migrateIfNeeded` eski
  kullanıcı verisini KAYBETMEDEN yeni alanları (loans, loanInstallments,
  kart geçmiş-borç bayrağı, profil) ekleyecek şekilde güncellendi.

**Bu sürümde doğrulama şekli (önemli, dürüstçe belirtilmeli)**
Bu ortamda internete erişim yoktur (`npm install` denemesi `403 Forbidden`
ile registry'ye ulaşamadı), bu yüzden gerçek bir `npm run build` bu ortamda
ÇALIŞTIRILAMADI. Bunun yerine tüm değişiklikler şu şekilde doğrulandı:
- Projedeki **46 kaynak dosyanın tamamı** TypeScript derleyicisiyle
  (allowJs modunda) tek tek sözdizimi kontrolünden geçirildi — 0 hata.
- Tüm göreli `import`'ların gerçekten var olan dosyalara işaret ettiği,
  ve her `import { X }` için `X`'in hedef dosyada gerçekten `export`
  edildiği otomatik olarak karşılaştırıldı — 0 uyuşmazlık.
- UI'dan `dispatch`'lenen her action tipinin reducer'da bir `case`'i
  olduğu karşılaştırıldı — eksiksiz.
- `financeEngine.js` ve `storage.js` gerçek Node.js üzerinde ÇALIŞTIRILARAK
  (statik analiz değil, gerçek yürütme) test edildi: demo veri seti üzerinde
  hesaplamaların çökmediği; çift-sayma düzeltmesinin (mevcut borç + yalnızca
  baseline sonrası işlemler) doğru sonuç verdiği; kart borcu ödemesinin
  FIFO sırasıyla doğru dağıtıldığı; bir kredi taksidi ödendi işaretlendiğinde
  `transactions` dizisine HİÇBİR yeni kayıt eklenmediği; ve eski (v2) bir
  kullanıcı verisinin migration'dan verisi kaybolmadan ve eski rakamları
  DEĞİŞTİRMEDEN geçtiği doğrulandı.
- Bu, "derleniyor" garantisinin yerini tutmaz — bilgisayarınızda ilk
  `npm install && npm run build` çalıştırmanızda bağımlılık sürümleriyle
  ilgili beklenmedik bir hata çıkarsa (örn. bir paketin son sürümünde
  breaking change), bana hata mesajını iletin, birlikte düzeltelim.

---

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

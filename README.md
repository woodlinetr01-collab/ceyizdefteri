# Çeyiz Defteri — Çift Finans Yönetimi, Düğün & Ev Kurma Bütçesi

React + Vite + PWA olarak hazırlanmış, gerçek işleyen bir kişisel/çift finans
yönetim uygulaması. Şu an Supabase bağlanmadan da (localStorage ile) tam
çalışır; Supabase kurulumu ile bulut senkronizasyonuna ve çok kullanıcılı
ortak hesaba geçilebilir.

**Güncel durum için mutlaka `CHANGELOG.md` dosyasını okuyun** — neyin
tamamen çalıştığı, neyin iskelet/hazırlık aşamasında olduğu orada satır
satır listelidir.

## Klasör Yapısı

```
├── index.html                  PWA/iOS meta etiketleri
├── vite.config.js              Vite + PWA (manifest/service worker) yapılandırması
├── vercel.json                 Vercel deploy + SPA rewrite ayarları
├── capacitor.config.json       Capacitor (iOS/Android) temel yapılandırması
├── package.json
├── .env.example                Supabase/Stripe ortam değişkeni şablonu
├── supabase/
│   └── schema.sql               Tüm tablolar + Row Level Security politikaları
├── public/
│   ├── favicon.svg
│   └── icons/                   PWA ikonları (192/512/maskable/apple-touch)
└── src/
    ├── main.jsx                 Provider ağacı + router kökü
    ├── App.jsx                  Route tanımları (landing, auth, /app/*)
    ├── index.css                 Tüm tasarım sistemi (açık/koyu tema dahil)
    ├── lib/                      Sabitler, tarih/para formatlama, finans motoru, i18n
    │   ├── constants.js
    │   ├── formatUtils.js
    │   ├── financeEngine.js       ★ Tüm finansal hesaplamaların tek kaynağı
    │   ├── i18n.js + locales/
    ├── data/demoData.js          Demo veri seti üretici
    ├── services/                 React'ten bağımsız iş mantığı katmanı
    │   ├── storage.js              localStorage kalıcılık katmanı
    │   ├── supabaseClient.js       Opsiyonel Supabase bağlantısı
    │   ├── authService.js          Yerel kimlik doğrulama (SHA-256)
    │   ├── lockService.js          PIN kilidi
    │   ├── premium.js              Feature-flag + fiyatlandırma
    │   ├── exportService.js        CSV/JSON/Excel/PDF dışa aktarma
    │   ├── importService.js        CSV/PDF ekstre içe aktarma
    │   └── aiAssistant.js          Kural tabanlı finans asistanı
    ├── contexts/                 AppData, UI (toast/confirm), Theme, Auth
    ├── hooks/usePremium.js
    ├── components/                UI bileşenleri (layout, transactions, ui)
    └── pages/                     Her ekran için bir sayfa bileşeni
```

## Kurulum ve Yerel Çalıştırma

Node.js 18+ gerekir.

```bash
npm install
npm run dev
```

Terminaldeki adresi (genelde `http://localhost:5173`) açın. `/` pazarlama
(landing) sayfasıdır; **"Uygulamayı Aç"** butonuyla `/app` altındaki gerçek
uygulamaya girersiniz. İlk açılışta "Boş Başla" veya "Demo Verileriyle
Başla" seçimini yaparsınız.

Telefonunuzdan aynı ağ üzerinden test için: `npm run dev -- --host`

## Prodüksiyon Derlemesi

```bash
npm run build
npm run preview
```

## Supabase Kurulumu (opsiyonel — bulut senkronizasyonu için)

1. [supabase.com](https://supabase.com) üzerinde ücretsiz bir proje açın.
2. `supabase/schema.sql` dosyasının tamamını Supabase Dashboard → SQL Editor'e
   yapıştırıp çalıştırın (tüm tabloları ve RLS politikalarını kurar).
3. `.env.example` dosyasını `.env` olarak kopyalayın, Project Settings → API
   sayfasındaki `URL` ve `anon public key` değerlerini girin.
4. Uygulama şu an localStorage kullanıyor — Supabase'i devreye almak için
   `src/services/` katmanındaki ilgili fonksiyonları `supabase` istemcisini
   kullanacak şekilde uyarlamanız gerekir (bkz. `CHANGELOG.md` → "Supabase
   kurulumu için yapılması gerekenler").

## Vercel'e Yayınlama

```bash
npm install -g vercel
vercel --prod
```

`vercel.json` build komutunu, çıktı klasörünü ve SPA yönlendirmesini (React
Router'ın `/app/*` yollarının 404 vermemesi için) otomatik ayarlar.

Supabase kullanacaksanız, Vercel proje ayarlarından Environment Variables
kısmına `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değerlerini eklemeyi
unutmayın.

## iPhone'da Ana Ekrana Ekleme (PWA)

Yayınlanan adresi **Safari**'de açın → Paylaş → **Ana Ekrana Ekle**. (Chrome
veya diğer tarayıcılarda iOS'ta gerçek PWA kurulumu çalışmaz.)

## Capacitor ile Native Uygulama (sonraki aşama)

```bash
npm install
npx cap add ios
npx cap add android
npm run build
npx cap sync
npx cap open ios      # Xcode açılır (macOS + Apple Developer hesabı gerekir)
npx cap open android  # Android Studio açılır
```

Detaylar ve eksikler için `CHANGELOG.md` → "App Store / Google Play için
henüz yapılmayanlar" bölümüne bakın.

## Environment Variables

`.env.example` dosyasına bakın. Hiçbir gerçek gizli anahtar bu repoda
bulunmaz; `.env` dosyanız `.gitignore` ile korunur.

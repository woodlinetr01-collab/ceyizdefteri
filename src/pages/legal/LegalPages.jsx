import React from "react";
import { Link } from "react-router-dom";

function LegalShell({ title, children }) {
  return (
    <div className="page legal-page">
      <Link to="/ayarlar" className="btn-ghost btn-sm" style={{ width: "fit-content" }}>← Ayarlara Dön</Link>
      <div className="panel legal-content">
        <div className="alert alert-amber">
          Bu sayfa yer tutucu (placeholder) metin içerir ve <b>bir hukukçu tarafından incelenip
          onaylanmadan yayına alınmamalıdır.</b> Gerçek kullanıcı verisi toplamadan önce KVKK ve
          uygulanabilir mevzuata uygunluk için hukuki danışmanlık alınması zorunludur.
        </div>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Gizlilik Politikası">
      <p>Çeyiz Defteri ("Uygulama"), kullanıcılarının finansal verilerinin gizliliğine önem verir.</p>
      <h3>Toplanan Veriler</h3>
      <p>Hesap bilgileri (e-posta), girdiğiniz finansal işlemler (gelir, gider, taksit, kredi kartı, borç/alacak bilgileri) ve uygulama kullanım tercihleri (tema, dil) saklanır.</p>
      <h3>Verilerin Saklanması</h3>
      <p>Varsayılan olarak veriler yalnızca cihazınızda (tarayıcı yerel depolaması) saklanır. Bulut senkronizasyonu etkinleştirildiğinde veriler Supabase altyapısı üzerinden şifreli bağlantıyla saklanır.</p>
      <h3>Veri Paylaşımı</h3>
      <p>Finansal verileriniz üçüncü taraflarla paylaşılmaz, satılmaz veya reklam amacıyla kullanılmaz.</p>
      <h3>Haklarınız</h3>
      <p>Verilerinizi dilediğiniz zaman dışa aktarabilir veya kalıcı olarak silebilirsiniz (Ayarlar → Veri Yönetimi).</p>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Kullanım Koşulları">
      <p>Bu Uygulamayı kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız.</p>
      <h3>Hizmetin Kapsamı</h3>
      <p>Uygulama, kişisel finans takibi amacıyla sunulan bir araçtır; profesyonel finansal, hukuki veya vergi danışmanlığı yerine geçmez.</p>
      <h3>Kullanıcı Sorumluluğu</h3>
      <p>Girilen verilerin doğruluğundan kullanıcı sorumludur. Uygulama, hesaplamaları girilen verilere dayanarak yapar.</p>
      <h3>Hizmetin Değişikliği</h3>
      <p>Özellikler zaman içinde değiştirilebilir, eklenebilir veya kaldırılabilir.</p>
    </LegalShell>
  );
}

export function KvkkPage() {
  return (
    <LegalShell title="KVKK Aydınlatma Metni">
      <p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, veri sorumlusu sıfatıyla kişisel verileriniz aşağıda açıklanan kapsamda işlenmektedir.</p>
      <h3>İşlenen Kişisel Veriler</h3>
      <p>Kimlik (ad, e-posta) ve finansal işlem verileri.</p>
      <h3>İşleme Amacı</h3>
      <p>Uygulama hizmetinin sunulması, hesap güvenliğinin sağlanması ve yasal yükümlülüklerin yerine getirilmesi.</p>
      <h3>Haklarınız (KVKK m.11)</h3>
      <p>Verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini/silinmesini talep etme ve işlemeye itiraz etme haklarına sahipsiniz.</p>
    </LegalShell>
  );
}

export function CookiesPage() {
  return (
    <LegalShell title="Çerez Politikası">
      <p>Uygulama, oturum yönetimi ve tercihlerinizin (tema, dil) hatırlanması için tarayıcı yerel depolamasını (localStorage) kullanır. Üçüncü taraf reklam/izleme çerezi kullanılmamaktadır.</p>
    </LegalShell>
  );
}

export function SubscriptionTermsPage() {
  return (
    <LegalShell title="Abonelik Koşulları">
      <p>Premium abonelik, aylık veya yıllık dönemler halinde sunulur. Güncel fiyatlar Premium sayfasında gösterilir.</p>
      <h3>Deneme Süresi</h3>
      <p>Yeni kullanıcılar için sunulan ücretsiz deneme süresi sonunda, iptal edilmediği takdirde ücretli plana geçiş yapılabilir (gerçek ödeme entegrasyonu tamamlandığında).</p>
      <h3>İptal</h3>
      <p>Aboneliğinizi istediğiniz zaman Ayarlar → Abonelik bölümünden iptal edebilirsiniz.</p>
    </LegalShell>
  );
}

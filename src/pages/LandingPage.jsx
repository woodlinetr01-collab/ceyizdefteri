import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, Heart, Home as HomeIcon, CreditCard, Users, MessageCircleQuestion, CheckCircle2 } from "lucide-react";
import { usePremium } from "../hooks/usePremium.js";

const FEATURES = [
  { icon: Heart, title: "Düğün Bütçesi", text: "Salon, gelinlik, fotoğrafçı ve daha fazlasını kategori bazında planlayın, gerçekleşeni anlık görün." },
  { icon: HomeIcon, title: "Ev Kurma", text: "Oda oda ürün, mağaza, garanti ve taksit bilgisiyle ev kurma sürecinizi yönetin." },
  { icon: CreditCard, title: "Taksit & Kredi Kartı", text: "Peşinat + taksit motoru, ekstre takibi ve limit uyarılarıyla kart borcunuz asla sürpriz olmaz." },
  { icon: Users, title: "Ortak Hesap", text: "Eşinizi davet edin, kim ne harcadı görün, ortak bütçenizi birlikte yönetin." },
  { icon: MessageCircleQuestion, title: "AI Finans Asistanı", text: "\"Bu ay ne kadar harcadım?\" gibi sorularınızı gerçek verilerinize dayanarak yanıtlar." },
  { icon: Sparkles, title: "Akıllı Uyarılar", text: "Yaklaşan ödemeler, bütçe aşımları ve kart limit uyarıları otomatik gelir." },
];

const FAQ = [
  { q: "Verilerim güvende mi?", a: "Verileriniz varsayılan olarak yalnızca cihazınızda saklanır. Bulut senkronizasyonu isteğe bağlıdır ve etkinleştirildiğinde şifreli bağlantı üzerinden Supabase altyapısında saklanır." },
  { q: "Ücretsiz mi?", a: "Temel özellikler ücretsizdir. Sınırsız işlem, ortak hesap, AI asistan ve gelişmiş dışa aktarma gibi özellikler Premium plana dahildir." },
  { q: "Eşimle aynı hesabı kullanabilir miyiz?", a: "Evet — Premium ortak hesap özelliğiyle eşinizi davet edip aynı bütçeyi birlikte yönetebilirsiniz." },
];

export default function LandingPage() {
  const { pricing } = usePremium();
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand"><Sparkles size={16} /> Çeyiz Defteri</div>
        <Link className="btn-primary btn-sm" to="/app">Uygulamayı Aç</Link>
      </header>

      <section className="landing-hero">
        <h1>Düğününüzü değil, birlikte kuracağınız hayatı bütçeleyin.</h1>
        <p>Düğün hazırlıkları, ev kurma ve çift finansınızı tek bir uygulamadan yönetin — taksitler, kredi kartları, borçlar ve gelecekteki ödemeler dahil.</p>
        <div className="landing-cta">
          <Link className="btn-primary" to="/app">Ücretsiz Başla</Link>
          <Link className="btn-ghost" to="/app/premium">Premium'u İncele</Link>
        </div>
      </section>

      <section className="landing-section">
        <h2>Nasıl Çalışır?</h2>
        <div className="landing-steps">
          <div><span>1</span>Bütçenizi ve gelirinizi girin</div>
          <div><span>2</span>Gider, taksit ve kredi kartlarınızı ekleyin</div>
          <div><span>3</span>Panelinizde her şeyi tek bakışta görün</div>
        </div>
      </section>

      <section className="landing-section">
        <h2>Özellikler</h2>
        <div className="landing-features">
          {FEATURES.map((f) => (
            <div className="landing-feature" key={f.title}><f.icon size={20} className="text-gold" /><h3>{f.title}</h3><p>{f.text}</p></div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-pricing">
        <h2>Premium</h2>
        <div className="landing-price-cards">
          <div><div className="mono price-amount">{pricing.monthly.label}</div><span className="muted">aylık</span></div>
          <div><div className="mono price-amount">{pricing.yearly.label}</div><span className="muted">yıllık {pricing.yearly.badge}</span></div>
        </div>
        <Link className="btn-primary" to="/app/premium">Detayları Gör</Link>
      </section>

      <section className="landing-section">
        <h2>Sıkça Sorulan Sorular</h2>
        <div className="landing-faq">
          {FAQ.map((f) => (
            <div key={f.q} className="landing-faq-item"><h3><CheckCircle2 size={15} className="text-emerald" /> {f.q}</h3><p>{f.a}</p></div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div>© {new Date().getFullYear()} Çeyiz Defteri</div>
        <div className="legal-links">
          <Link to="/gizlilik">Gizlilik</Link>
          <Link to="/kullanim-kosullari">Koşullar</Link>
          <Link to="/kvkk">KVKK</Link>
          <Link to="/cerez-politikasi">Çerezler</Link>
        </div>
      </footer>
    </div>
  );
}

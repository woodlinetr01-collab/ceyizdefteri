import React from "react";
import { Check, Sparkles } from "lucide-react";
import { usePremium } from "../hooks/usePremium.js";
import { useUI } from "../contexts/UIContext.jsx";
import { SectionTitle } from "../components/ui/Primitives.jsx";
import { PLAN } from "../services/premium.js";

const FREE_FEATURES = ["60 işleme kadar", "2 kredi kartı", "5 taksitli plan", "Temel raporlar", "CSV / JSON dışa aktarma"];
const PREMIUM_FEATURES = ["Sınırsız işlem, kart ve taksit", "Ortak hesap (eş daveti)", "AI Finans Asistanı", "PDF / Excel dışa aktarma", "Ekstre içe aktarma", "Gelişmiş bildirimler"];

export default function PremiumPage() {
  const { sub, isPremium, startTrial, activate, cancel, pricing } = usePremium();
  const { toast } = useUI();

  return (
    <div className="page">
      <SectionTitle kicker="Premium" title="Çeyiz Defteri Premium" />

      <div className="panel" style={{ textAlign: "center" }}>
        <Sparkles size={28} className="text-gold" />
        <h2 style={{ fontFamily: "var(--font-display)", margin: "10px 0 4px" }}>Birlikte kuracağınız hayatı sınırsız yönetin</h2>
        <p className="muted">
          {sub.plan === PLAN.TRIAL ? `Deneme sürümü — ${new Date(sub.trialEndsAt).toLocaleDateString("tr-TR")} tarihine kadar aktif.`
            : sub.plan === PLAN.PREMIUM ? "Premium aktif — teşekkürler!"
            : "Şu an ücretsiz plandasınız."}
        </p>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3 className="panel-h">Ücretsiz</h3>
          <ul className="plan-list">{FREE_FEATURES.map((f) => <li key={f}><Check size={14} /> {f}</li>)}</ul>
        </div>
        <div className="panel panel-highlight">
          <h3 className="panel-h">Premium</h3>
          <ul className="plan-list">{PREMIUM_FEATURES.map((f) => <li key={f}><Check size={14} /> {f}</li>)}</ul>
          <div className="pricing-row">
            <div><div className="mono price-amount">{pricing.monthly.label}</div><span className="muted">aylık</span></div>
            <div><div className="mono price-amount">{pricing.yearly.label}</div><span className="muted">yıllık {pricing.yearly.badge ? `· ${pricing.yearly.badge}` : ""}</span></div>
          </div>
          {isPremium ? (
            <button className="btn-danger" style={{ width: "100%", marginTop: 10 }} onClick={() => { cancel(); toast("Aboneliğiniz iptal edildi."); }}>Aboneliği İptal Et</button>
          ) : (
            <>
              {sub.plan !== PLAN.TRIAL && sub.plan !== PLAN.CANCELLED && (
                <button className="btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={() => { startTrial(); toast(`${pricing.trialDays} günlük ücretsiz deneme başladı!`); }}>
                  {pricing.trialDays} Gün Ücretsiz Dene
                </button>
              )}
              <button className="btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={() => { activate("monthly"); toast("Premium aktif edildi (demo)."); }}>
                Premium'a Geç (Demo)
              </button>
              <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                Not: Bu bir demo aktivasyondur — gerçek ödeme alınmaz. Gerçek ödeme akışı için Stripe (web) ya da App
                Store/Play Store In-App Purchase (mobil) entegrasyonu gerekir; bkz. services/premium.js üst notları.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

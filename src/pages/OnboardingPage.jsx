import React, { useState } from "react";
import { Sparkles, FileStack, FilePlus, ArrowRight, ArrowLeft } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useUI } from "../contexts/UIContext.jsx";
import { CURRENCIES } from "../lib/constants.js";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingPage() {
  const { dispatch } = useAppData();
  const { signUp } = useAuth();
  const { toast } = useUI();

  const [step, setStep] = useState("welcome"); // welcome | account | start
  const [name, setName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const validateAccount = () => {
    const e = {};
    if (!name.trim()) e.name = "Adınızı girin.";
    if (!EMAIL_RX.test(email)) e.email = "Geçerli bir e-posta girin.";
    if (password.length < 6) e.password = "Şifre en az 6 karakter olmalı.";
    if (monthlyIncome && (isNaN(Number(monthlyIncome)) || Number(monthlyIncome) < 0)) e.monthlyIncome = "Geçerli bir tutar girin.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToStart = () => {
    if (!validateAccount()) return;
    setStep("start");
  };

  const finish = async (dataMode) => {
    setBusy(true);
    try {
      try {
        await signUp({ email, password, displayName: name });
      } catch (err) {
        // Hesap zaten varsa (örn. sayfa yenilendi) onboarding'i durdurmayalım —
        // yerel finansal veri her durumda oluşturulur.
        console.warn("Yerel hesap oluşturulamadı:", err.message);
      }
      const profile = { name, partnerName: partnerName || null, currency, monthlyIncome: Number(monthlyIncome || 0) };
      dispatch({ type: "COMPLETE_ONBOARDING", payload: { profile, dataMode } });
      toast(dataMode === "demo" ? "Demo verileriyle başlıyorsunuz." : "Hesabınız oluşturuldu, boş başlıyorsunuz.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        <div className="brand-mark" style={{ width: 44, height: 44, marginBottom: 18 }}><Sparkles size={22} strokeWidth={1.6} /></div>

        {step === "welcome" && (
          <>
            <h1>Çeyiz Defteri'ne Hoş Geldiniz</h1>
            <p>Düğün hazırlıkları, ev kurma, kredi kartları, krediler ve çift finansınızı tek yerden yönetin.</p>
            <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setStep("account")}>
              Hesabını Oluştur <ArrowRight size={16} />
            </button>
          </>
        )}

        {step === "account" && (
          <>
            <h1 style={{ fontSize: 20 }}>Hesabını Oluştur</h1>
            <p style={{ marginBottom: 14 }}>Bu bilgiler yalnızca bu cihazda saklanır ve dilediğiniz zaman Ayarlar'dan güncellenebilir.</p>
            <form style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }} onSubmit={(e) => { e.preventDefault(); goToStart(); }}>
              <div className="field-grid">
                <label className="field"><span>Adınız</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad Soyad" />{errors.name && <span className="alert alert-red" style={{ padding: "4px 8px", fontSize: 11 }}>{errors.name}</span>}</label>
                <label className="field"><span>Partner Adı (opsiyonel)</span><input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Opsiyonel" /></label>
              </div>
              <label className="field"><span>E-posta</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@eposta.com" />{errors.email && <span className="alert alert-red" style={{ padding: "4px 8px", fontSize: 11 }}>{errors.email}</span>}</label>
              <label className="field"><span>Şifre</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 6 karakter" />{errors.password && <span className="alert alert-red" style={{ padding: "4px 8px", fontSize: 11 }}>{errors.password}</span>}</label>
              <div className="field-grid">
                <label className="field"><span>Para Birimi</span><select value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></label>
                <label className="field"><span>Aylık Gelir (opsiyonel)</span><input type="number" min="0" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} placeholder="0" />{errors.monthlyIncome && <span className="alert alert-red" style={{ padding: "4px 8px", fontSize: 11 }}>{errors.monthlyIncome}</span>}</label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button type="button" className="btn-ghost" onClick={() => setStep("welcome")}><ArrowLeft size={15} /> Geri</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>Devam Et <ArrowRight size={16} /></button>
              </div>
            </form>
          </>
        )}

        {step === "start" && (
          <>
            <h1 style={{ fontSize: 20 }}>Nasıl başlamak istersiniz?</h1>
            <p>{name}, hesabınız neredeyse hazır. Son bir adım kaldı.</p>
            <div className="onboarding-choices">
              <button className="onboarding-choice" disabled={busy} onClick={() => finish("empty")}>
                <FilePlus size={22} />
                <div><b>Boş Başla</b><span>Kendi verilerinizle sıfırdan başlayın{Number(monthlyIncome) > 0 ? " (aylık geliriniz otomatik eklenecek)" : ""}</span></div>
              </button>
              <button className="onboarding-choice" disabled={busy} onClick={() => finish("demo")}>
                <FileStack size={22} />
                <div><b>Demo Verileriyle Başla</b><span>Örnek düğün/ev bütçesi, kart ve kredi verisiyle uygulamayı keşfedin</span></div>
              </button>
            </div>
            <button className="btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setStep("account")}><ArrowLeft size={14} /> Bilgileri Düzenle</button>
          </>
        )}

        <p className="muted onboarding-note">Dilediğiniz zaman Ayarlar → Veri Yönetimi'nden demo verilerini temizleyebilir veya tüm verilerinizi silebilirsiniz.</p>
      </div>
    </div>
  );
}

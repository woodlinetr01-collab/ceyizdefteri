import React from "react";
import { Sparkles, FileStack, FilePlus } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";

export default function OnboardingPage() {
  const { dispatch } = useAppData();

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        <div className="brand-mark" style={{ width: 44, height: 44, marginBottom: 18 }}><Sparkles size={22} strokeWidth={1.6} /></div>
        <h1>Çeyiz Defteri'ne Hoş Geldiniz</h1>
        <p>Düğün hazırlıkları, ev kurma ve çift finansınızı tek yerden yönetin. Nasıl başlamak istersiniz?</p>
        <div className="onboarding-choices">
          <button className="onboarding-choice" onClick={() => dispatch({ type: "INIT_EMPTY" })}>
            <FilePlus size={22} />
            <div><b>Boş Başla</b><span>Kendi verilerinizle sıfırdan başlayın</span></div>
          </button>
          <button className="onboarding-choice" onClick={() => dispatch({ type: "INIT_DEMO" })}>
            <FileStack size={22} />
            <div><b>Demo Verileriyle Başla</b><span>Örnek düğün/ev bütçesiyle uygulamayı keşfedin</span></div>
          </button>
        </div>
        <p className="muted onboarding-note">Dilediğiniz zaman Ayarlar → Veri Yönetimi'nden demo verilerini temizleyebilir veya tüm verilerinizi silebilirsiniz.</p>
      </div>
    </div>
  );
}

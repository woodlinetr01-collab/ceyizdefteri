import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useUI } from "../contexts/UIContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { usePremium } from "../hooks/usePremium.js";
import { SectionTitle, Eyebrow } from "../components/ui/Primitives.jsx";
import { exportBackupJsonFile } from "../services/exportService.js";
import { parseBackupJson } from "../services/storage.js";
import * as lockService from "../services/lockService.js";

export default function SettingsPage() {
  const { state, dispatch } = useAppData();
  const { toast, confirm } = useUI();
  const { pref, setPref } = useTheme();
  const { user, signOut } = useAuth();
  const { sub, isPremium, pricing } = usePremium();
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [lockEnabled, setLockEnabled] = useState(lockService.isLockEnabled());
  const [pin, setPin] = useState("");

  const clearDemo = async () => {
    const ok = await confirm({ title: "Demo verilerini temizle", message: "Tüm örnek (demo) veriler silinecek ve boş bir uygulamayla başlayacaksınız. Bu işlem geri alınamaz.", danger: true, confirmLabel: "Temizle" });
    if (!ok) return;
    dispatch({ type: "CLEAR_DEMO_KEEP_USER_DATA" });
    toast("Demo verileri temizlendi.");
  };

  const deleteEverything = async () => {
    const ok1 = await confirm({ title: "Tüm verilerinizi silmek istediğinize emin misiniz?", message: "Bu işlem TÜM işlemlerinizi, kartlarınızı, bütçelerinizi ve borç/alacak kayıtlarınızı kalıcı olarak siler.", danger: true, confirmLabel: "Devam Et" });
    if (!ok1) return;
    const ok2 = await confirm({ title: "Son onay", message: "Bu işlem GERİ ALINAMAZ. Silmek istediğinizden kesinlikle emin misiniz?", danger: true, confirmLabel: "Evet, Kalıcı Olarak Sil" });
    if (!ok2) return;
    dispatch({ type: "RESET_ALL" });
    toast("Tüm veriler silindi.");
  };

  const importBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = parseBackupJson(reader.result);
        const ok = await confirm({ title: "Yedeği içe aktar", message: "Mevcut verilerinizin üzerine yazılacak. Devam edilsin mi?", danger: true, confirmLabel: "İçe Aktar" });
        if (!ok) return;
        dispatch({ type: "IMPORT_BACKUP", payload: data });
        toast("Yedek başarıyla içe aktarıldı.");
      } catch (err) {
        toast("Geçersiz yedek dosyası: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const savePin = async () => {
    try {
      await lockService.setPin(pin);
      setLockEnabled(true);
      toast("PIN kilidi etkinleştirildi.");
      setPin("");
    } catch (err) {
      toast(err.message);
    }
  };
  const disableLock = () => {
    lockService.disableLock();
    setLockEnabled(false);
    toast("PIN kilidi kapatıldı.");
  };

  return (
    <div className="page">
      <SectionTitle kicker="Uygulama" title="Ayarlar" />

      <div className="panel">
        <h3 className="panel-h">Profil</h3>
        {user ? (
          <div className="settings-row"><span>{user.displayName} · {user.email}</span><button className="btn-ghost btn-sm" onClick={signOut}>Çıkış Yap</button></div>
        ) : (
          <div className="settings-row"><span className="muted">Giriş yapılmadı — veriler yalnızca bu cihazda saklanıyor.</span><Link className="btn-ghost btn-sm" to="/giris">Giriş Yap / Kayıt Ol</Link></div>
        )}
      </div>

      <div className="panel">
        <h3 className="panel-h">Görünüm</h3>
        <div className="settings-row">
          <span>Tema</span>
          <div className="seg seg-small">
            {[{ v: "light", l: "Açık" }, { v: "dark", l: "Koyu" }, { v: "system", l: "Sistem" }].map((o) => (
              <button key={o.v} className={pref === o.v ? "active" : ""} onClick={() => setPref(o.v)}>{o.l}</button>
            ))}
          </div>
        </div>
        <div className="settings-row"><span>Dil</span><span className="muted">Türkçe (İngilizce/Almanca altyapısı hazır — bkz. src/lib/i18n.js)</span></div>
        <div className="settings-row"><span>Para Birimi</span><span className="muted">₺ Türk Lirası</span></div>
      </div>

      <div className="panel">
        <h3 className="panel-h">Güvenlik — Uygulama Kilidi</h3>
        {lockEnabled ? (
          <div className="settings-row"><span>PIN kilidi etkin.</span><button className="btn-ghost btn-sm" onClick={disableLock}>Kilidi Kapat</button></div>
        ) : (
          <div className="settings-row">
            <input type="password" inputMode="numeric" maxLength={4} placeholder="4 haneli PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} style={{ width: 120 }} />
            <button className="btn-primary btn-sm" disabled={pin.length !== 4} onClick={savePin}>PIN Belirle</button>
          </div>
        )}
        <p className="muted" style={{ marginTop: 8 }}>Biyometrik kilit (Face ID/Touch ID) mimarisi hazırlandı — bkz. services/lockService.js. Tam entegrasyon Capacitor'a geçişte native eklenti gerektirir.</p>
      </div>

      <div className="panel">
        <h3 className="panel-h">Abonelik</h3>
        <div className="settings-row">
          <span>Mevcut plan: <b>{sub.plan === "premium" ? "Premium" : sub.plan === "trial" ? "Premium Deneme" : sub.plan === "cancelled" ? "İptal Edildi" : "Ücretsiz"}</b></span>
          <Link className="btn-primary btn-sm" to="/app/premium">{isPremium ? "Aboneliği Yönet" : "Premium'a Yükselt"}</Link>
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-h">Veri Yönetimi</h3>
        <div className="settings-row"><span>Geçerli veri modu: <b>{state.meta?.dataMode === "demo" ? "Demo Verileri" : state.meta?.dataMode === "restored" ? "İçe Aktarılmış Yedek" : "Gerçek Veri"}</b></span></div>
        {state.meta?.dataMode === "demo" && (
          <div className="settings-row"><span>Demo verileriyle başladınız.</span><button className="btn-ghost btn-sm" onClick={clearDemo}>Demo Verilerini Temizle</button></div>
        )}
        <div className="settings-row"><span>Yedek dışa aktar (JSON)</span><button className="btn-ghost btn-sm" onClick={() => exportBackupJsonFile(state)}>Dışa Aktar</button></div>
        <div className="settings-row">
          <span>Yedekten geri yükle (JSON)</span>
          <button className="btn-ghost btn-sm" onClick={() => fileInput.current?.click()}>İçe Aktar</button>
          <input ref={fileInput} type="file" accept="application/json" style={{ display: "none" }} onChange={importBackup} />
        </div>
        <div className="settings-row"><span className="text-rose">Hesabımı ve tüm verilerimi sil</span><button className="btn-danger btn-sm" onClick={deleteEverything}>Kalıcı Olarak Sil</button></div>
      </div>

      <div className="panel">
        <h3 className="panel-h">Yasal</h3>
        <div className="legal-links">
          <Link to="/gizlilik">Gizlilik Politikası</Link>
          <Link to="/kullanim-kosullari">Kullanım Koşulları</Link>
          <Link to="/kvkk">KVKK Aydınlatma Metni</Link>
          <Link to="/cerez-politikasi">Çerez Politikası</Link>
          <Link to="/abonelik-kosullari">Abonelik Koşulları</Link>
        </div>
      </div>
    </div>
  );
}

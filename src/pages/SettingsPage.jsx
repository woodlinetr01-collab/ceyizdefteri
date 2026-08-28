import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Trash2, X } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useUI } from "../contexts/UIContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { usePremium } from "../hooks/usePremium.js";
import { SectionTitle, Eyebrow, EmptyState } from "../components/ui/Primitives.jsx";
import { exportBackupJsonFile } from "../services/exportService.js";
import { parseBackupJson } from "../services/storage.js";
import * as lockService from "../services/lockService.js";
import { CURRENCIES, RECURRING_FREQUENCIES } from "../lib/constants.js";
import { fmtTL, fmtDate } from "../lib/formatUtils.js";

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
        <ProfileEditor profile={state.meta?.profile} />
      </div>

      <div className="panel">
        <h3 className="panel-h">Düzenli İşlemler</h3>
        <RecurringRulesManager />
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

/** Onboarding'de girilen profil bilgilerini (ad, partner adı, para birimi,
 * aylık gelir) sonradan düzenlemeyi sağlar — madde 13. */
function ProfileEditor({ profile }) {
  const { dispatch } = useAppData();
  const { toast } = useUI();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [partnerName, setPartnerName] = useState(profile?.partnerName || "");
  const [currency, setCurrency] = useState(profile?.currency || "TRY");
  const [monthlyIncome, setMonthlyIncome] = useState(profile?.monthlyIncome ? String(profile.monthlyIncome) : "");

  if (!profile) return null;

  if (!editing) {
    return (
      <>
        <div className="settings-row"><span>Adınız</span><span className="muted">{profile.name}</span></div>
        {profile.partnerName && <div className="settings-row"><span>Partner Adı</span><span className="muted">{profile.partnerName}</span></div>}
        <div className="settings-row"><span>Para Birimi</span><span className="muted">{profile.currency}</span></div>
        {profile.monthlyIncome > 0 && <div className="settings-row"><span>Aylık Gelir</span><span className="muted mono">{fmtTL(profile.monthlyIncome)}</span></div>}
        <div className="settings-row"><span /><button className="btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil size={13} /> Profili Düzenle</button></div>
      </>
    );
  }

  const save = () => {
    if (!name.trim()) { toast("Adınızı girin."); return; }
    dispatch({ type: "UPDATE_PROFILE", patch: { name, partnerName: partnerName || null, currency, monthlyIncome: Number(monthlyIncome || 0) } });
    toast("Profil güncellendi.");
    setEditing(false);
  };

  return (
    <div style={{ paddingTop: 8 }}>
      <div className="field-grid">
        <label className="field"><span>Adınız</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Partner Adı</span><input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Opsiyonel" /></label>
      </div>
      <div className="field-grid" style={{ marginTop: 10 }}>
        <label className="field"><span>Para Birimi</span><select value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></label>
        <label className="field"><span>Aylık Gelir</span><input type="number" min="0" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} /></label>
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>Not: Aylık geliri buradan değiştirmek, onboarding'de otomatik oluşturulan düzenli geliri güncellemez — onu aşağıdaki "Düzenli İşlemler" bölümünden ayrıca düzenleyebilirsiniz.</p>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Vazgeç</button>
        <button className="btn-primary btn-sm" onClick={save}>Kaydet</button>
      </div>
    </div>
  );
}

/** Onboarding'de veya işlem eklerken oluşturulan düzenli gelir/gider
 * kurallarını listeler; tutar/sıklık/bitiş tarihi düzenlenebilir, kural
 * silinebilir (yalnızca gelecekteki üretimi durdurur — geçmişte zaten
 * oluşturulmuş işlemler etkilenmez). */
function RecurringRulesManager() {
  const { state, dispatch } = useAppData();
  const { toast, confirm } = useUI();
  const [editTarget, setEditTarget] = useState(null);

  const rules = state.recurringRules || [];
  const remove = async (rule) => {
    const ok = await confirm({ title: "Bu düzenli işlemi silmek istediğinize emin misiniz?", message: `"${rule.desc}" için gelecekteki otomatik kayıtlar artık oluşturulmayacak. Geçmişte oluşturulmuş kayıtlar silinmez.`, danger: true, confirmLabel: "Sil" });
    if (!ok) return;
    dispatch({ type: "DELETE_RECURRING", id: rule.id });
    toast("Düzenli işlem silindi.");
  };

  if (rules.length === 0) return <EmptyState text="Henüz düzenli bir gelir/gider oluşturmadınız." />;

  return (
    <div className="stack">
      {rules.map((r) => (
        <div className="settings-row" key={r.id}>
          <span>
            <b>{r.desc}</b> <span className="muted mono">{fmtTL(r.amount)}</span>
            <span className="tag-soft">{r.kind === "income" ? "gelir" : "gider"} · {RECURRING_FREQUENCIES.find((f) => f.key === r.frequency)?.label}</span>
          </span>
          <span style={{ display: "flex", gap: 4 }}>
            <button className="icon-btn" onClick={() => setEditTarget(r)}><Pencil size={14} /></button>
            <button className="icon-btn" onClick={() => remove(r)}><Trash2 size={14} /></button>
          </span>
        </div>
      ))}
      {editTarget && <RecurringRuleEditModal rule={editTarget} onClose={() => setEditTarget(null)} />}
    </div>
  );
}

function RecurringRuleEditModal({ rule, onClose }) {
  const { dispatch } = useAppData();
  const { toast } = useUI();
  const [amount, setAmount] = useState(String(rule.amount));
  const [frequency, setFrequency] = useState(rule.frequency);
  const [endDate, setEndDate] = useState(rule.endDate || "");
  const [active, setActive] = useState(rule.active);

  const save = () => {
    dispatch({ type: "UPDATE_RECURRING", id: rule.id, patch: { amount: Number(amount), frequency, endDate: endDate || null, active } });
    dispatch({ type: "APPLY_RECURRING" });
    toast("Düzenli işlem güncellendi.");
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><Eyebrow>Düzenle</Eyebrow><h3>{rule.desc}</h3></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <div className="field-grid">
            <label className="field"><span>Tutar (₺)</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label className="field"><span>Sıklık</span><select value={frequency} onChange={(e) => setFrequency(e.target.value)}>{RECURRING_FREQUENCIES.filter((f) => f.key !== "custom").map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></label>
          </div>
          <label className="field"><span>Bitiş Tarihi (opsiyonel)</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
          <label className="check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Aktif (gelecek kayıtları üretmeye devam et)</label>
        </div>
        <div className="modal-foot"><button className="btn-ghost" onClick={onClose}>Vazgeç</button><button className="btn-primary" onClick={save}>Kaydet</button></div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useUI } from "../contexts/UIContext.jsx";

export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin"); // signin | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") { await signIn({ email, password }); toast("Giriş başarılı."); navigate("/app/ayarlar"); }
      else if (mode === "signup") { await signUp({ email, password, displayName }); toast("Hesap oluşturuldu."); navigate("/app/ayarlar"); }
      else { await resetPassword({ email, newPassword: password }); toast("Şifre güncellendi, giriş yapabilirsiniz."); setMode("signin"); }
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card" style={{ maxWidth: 380 }}>
        <div className="brand-mark" style={{ width: 40, height: 40, marginBottom: 14 }}><Sparkles size={20} strokeWidth={1.6} /></div>
        <h1 style={{ fontSize: 22 }}>{mode === "signin" ? "Giriş Yap" : mode === "signup" ? "Hesap Oluştur" : "Şifreni Sıfırla"}</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Bu hesap yalnızca bu cihazda saklanır (bkz. Ayarlar). Çoklu cihaz senkronizasyonu için Supabase kurulumu gerekir.
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          {mode === "signup" && (
            <label className="field"><span>Ad</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
          )}
          <label className="field"><span>E-posta</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field"><span>{mode === "reset" ? "Yeni Şifre" : "Şifre"}</span><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <div className="alert alert-red">{error}</div>}
          <button className="btn-primary" type="submit" disabled={busy}>{busy ? "İşleniyor…" : mode === "signin" ? "Giriş Yap" : mode === "signup" ? "Hesap Oluştur" : "Şifreyi Güncelle"}</button>
        </form>
        <div className="auth-switch">
          {mode !== "signin" && <button onClick={() => setMode("signin")}>Giriş Yap</button>}
          {mode !== "signup" && <button onClick={() => setMode("signup")}>Hesap Oluştur</button>}
          {mode !== "reset" && <button onClick={() => setMode("reset")}>Şifremi Unuttum</button>}
        </div>
      </div>
    </div>
  );
}

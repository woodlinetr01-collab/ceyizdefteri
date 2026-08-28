import React, { useState } from "react";
import { Lock } from "lucide-react";
import * as lockService from "../../services/lockService.js";

export default function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const ok = await lockService.verifyPin(pin);
    if (ok) onUnlock();
    else { setError(true); setPin(""); }
  };

  return (
    <div className="onboarding-screen">
      <form className="onboarding-card" style={{ maxWidth: 320 }} onSubmit={submit}>
        <div className="brand-mark" style={{ width: 44, height: 44, marginBottom: 16 }}><Lock size={20} /></div>
        <h1 style={{ fontSize: 20 }}>Kilitli</h1>
        <p className="muted">Devam etmek için 4 haneli PIN'inizi girin.</p>
        <input
          type="password" inputMode="numeric" maxLength={4} autoFocus
          value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(false); }}
          style={{ fontSize: 24, textAlign: "center", letterSpacing: 8, padding: "12px 10px", width: "100%", margin: "14px 0", border: `1px solid ${error ? "var(--rose)" : "var(--line)"}`, borderRadius: 10 }}
        />
        {error && <div className="alert alert-red">Hatalı PIN, tekrar deneyin.</div>}
        <button className="btn-primary" type="submit" style={{ width: "100%" }} disabled={pin.length !== 4}>Kilidi Aç</button>
      </form>
    </div>
  );
}

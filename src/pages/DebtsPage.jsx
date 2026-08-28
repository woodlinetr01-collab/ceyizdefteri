import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus, X, Trash2, Pencil } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useUI } from "../contexts/UIContext.jsx";
import { SectionTitle, SummaryCard, Eyebrow, EmptyState } from "../components/ui/Primitives.jsx";
import { fmtTL, fmtDate, todayIso } from "../lib/formatUtils.js";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function DebtsPage() {
  const { calc } = useAppData();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => {
    if (location.state?.openAdd) setOpen(true);
  }, [location.state]);

  const live = calc.debtsEnriched;

  return (
    <div className="page">
      <SectionTitle kicker="Kişiler Arası" title="Borç &amp; Alacak Takibi" action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Yeni Kayıt</button>} />

      <div className="sum-grid sum-grid-2">
        <SummaryCard label="Toplam Alacak" value={fmtTL(calc.receivable)} icon={TrendingUp} tone="emerald" />
        <SummaryCard label="Toplam Borç" value={fmtTL(calc.debtToOthers)} icon={TrendingDown} tone="rose" />
      </div>

      <div className="two-col">
        <div className="panel">
          <h3 className="panel-h">Benden Alınacak</h3>
          {live.filter((d) => d.direction === "alacak").length === 0 ? <EmptyState text="Kayıt yok." /> : live.filter((d) => d.direction === "alacak").map((d) => <DebtRow d={d} key={d.id} onEdit={() => setEditTarget(d)} />)}
        </div>
        <div className="panel">
          <h3 className="panel-h">Benim Ödeyeceğim</h3>
          {live.filter((d) => d.direction === "borc").length === 0 ? <EmptyState text="Kayıt yok." /> : live.filter((d) => d.direction === "borc").map((d) => <DebtRow d={d} key={d.id} onEdit={() => setEditTarget(d)} />)}
        </div>
      </div>

      {open && <DebtFormModal onClose={() => setOpen(false)} />}
      {editTarget && <DebtFormModal debt={editTarget} onClose={() => setEditTarget(null)} />}
    </div>
  );
}

function DebtFormModal({ debt, onClose }) {
  const { dispatch } = useAppData();
  const { toast } = useUI();
  const isEdit = !!debt;
  const [person, setPerson] = useState(debt?.person || "");
  const [direction, setDirection] = useState(debt?.direction || "alacak");
  const [amount, setAmount] = useState(debt ? String(debt.amount) : "");
  const [dueDate, setDueDate] = useState(debt?.dueDate || todayIso());
  const [note, setNote] = useState(debt?.note || "");

  const submit = () => {
    if (!person.trim() || !amount) return;
    const payload = { person, direction, amount: Number(amount), dueDate, note };
    if (isEdit) {
      dispatch({ type: "UPDATE_DEBT", id: debt.id, patch: payload });
      toast("Kayıt güncellendi.");
    } else {
      dispatch({ type: "ADD_DEBT", payload });
      toast("Kayıt eklendi.");
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><Eyebrow>{isEdit ? "Düzenle" : "Yeni Kayıt"}</Eyebrow><h3>{isEdit ? debt.person : "Borç / Alacak Ekle"}</h3></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <div className="seg"><button className={direction === "alacak" ? "active" : ""} onClick={() => setDirection("alacak")}>Benden Alınacak</button><button className={direction === "borc" ? "active" : ""} onClick={() => setDirection("borc")}>Benim Ödeyeceğim</button></div>
          <div className="field-grid">
            <label className="field"><span>Kişi</span><input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Ad Soyad" /></label>
            <label className="field"><span>Tutar (₺)</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          </div>
          <div className="field-grid">
            <label className="field"><span>Vade Tarihi</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
            <label className="field"><span>Not</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsiyonel" /></label>
          </div>
          {isEdit && (debt.payments || []).length > 0 && (
            <div className="alert alert-amber">Bu kayda daha önce {fmtTL(debt.paid)} ödeme kaydedilmiş; bu düzenleme yalnızca tutar/tarih/not bilgilerini değiştirir, ödeme geçmişini etkilemez.</div>
          )}
        </div>
        <div className="modal-foot"><button className="btn-ghost" onClick={onClose}>Vazgeç</button><button className="btn-primary" onClick={submit}>Kaydet</button></div>
      </div>
    </div>
  );
}

function DebtRow({ d, onEdit }) {
  const { dispatch } = useAppData();
  const { toast, confirm } = useUI();
  const [payOpen, setPayOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const toneClass = d.status === "Tamamlandı" ? "on" : d.status === "Kısmen Ödendi" ? "status-partial on" : "";

  const remove = async () => {
    const ok = await confirm({ title: "Bu kaydı silmek istediğinize emin misiniz?", message: d.person, danger: true, confirmLabel: "Sil" });
    if (!ok) return;
    dispatch({ type: "SOFT_DELETE_DEBT", id: d.id });
    toast("Kayıt silindi.", { actionLabel: "Geri Al", onAction: () => dispatch({ type: "RESTORE_DEBT", id: d.id }) });
  };

  const addPayment = () => {
    const n = Number(amt);
    if (!n || n <= 0) return;
    dispatch({ type: "ADD_PAYMENT_TO_DEBT", payload: { debtId: d.id, amount: n, date: todayIso() } });
    setPayOpen(false); setAmt("");
    toast("Ödeme kaydedildi.");
  };

  return (
    <div className="debt-row">
      <div>
        <div className="debt-person">{d.person}</div>
        <div className="muted">{d.note} · Vade {fmtDate(d.dueDate)} · Kalan <b className="mono">{fmtTL(d.remaining)}</b></div>
      </div>
      <div className="debt-right">
        <span className="mono">{fmtTL(d.amount)}</span>
        {payOpen ? (
          <span className="inline-pay">
            <input type="number" autoFocus value={amt} onChange={(e) => setAmt(e.target.value)} placeholder={String(d.remaining)} style={{ width: 90 }} />
            <button className="pill-btn on" onClick={addPayment}>Ekle</button>
          </span>
        ) : (
          d.status !== "Tamamlandı" && <button className="pill-btn" onClick={() => setPayOpen(true)}>Ödeme Ekle</button>
        )}
        <span className={`pill-btn ${toneClass}`}>{d.status}</span>
        <button className="icon-btn" onClick={onEdit}><Pencil size={14} /></button>
        <button className="icon-btn" onClick={remove}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

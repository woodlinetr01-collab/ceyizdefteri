import React, { useState } from "react";
import { Plus, X, Landmark, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useUI } from "../contexts/UIContext.jsx";
import { SectionTitle, SummaryCard, Eyebrow, EmptyState, StatusPill } from "../components/ui/Primitives.jsx";
import { fmtTL, fmtDate, todayIso } from "../lib/formatUtils.js";

export default function LoansPage() {
  const { calc } = useAppData();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="page">
      <SectionTitle kicker="Krediler" title="Kredi Ödemeleri" action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Kredi Ekle</button>} />

      <div className="sum-grid sum-grid-2">
        <SummaryCard label="Toplam Kalan Kredi Borcu" value={fmtTL(calc.loanDebtTotal)} icon={Landmark} tone="rose" />
        <SummaryCard label="Bu Ay Kredi Ödemesi" value={fmtTL(calc.loanThisMonthTotal)} icon={Landmark} tone="gold" />
      </div>

      {calc.loansComputed.length === 0 ? (
        <div className="panel"><EmptyState title="Henüz kredi eklemediniz" text='Konut, taşıt veya ihtiyaç krediniz varsa "Kredi Ekle" ile taksit takibine başlayın.' /></div>
      ) : (
        <div className="stack">
          {calc.loansComputed.map((loan) => (
            <div className="panel" key={loan.id}>
              <div className="month-head">
                <div>
                  <h3>{loan.name}</h3>
                  <span className="muted">{loan.bank}{loan.interestRate ? ` · Faiz %${loan.interestRate}` : ""}</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="icon-btn" onClick={() => setEditTarget(loan)}><Pencil size={15} /></button>
                  <DeleteLoanButton loan={loan} />
                </div>
              </div>

              <div className="sum-grid sum-grid-3" style={{ marginTop: 10 }}>
                <SummaryCard label="Toplam Kredi" value={fmtTL(loan.totalAmount)} tone="ink" />
                <SummaryCard label="Kalan Borç (tahmini)" value={fmtTL(loan.remainingDebt)} tone="rose" />
                <SummaryCard label="Aylık Taksit" value={fmtTL(loan.monthlyPayment)} tone="gold" />
              </div>

              <div className="budget-row" style={{ marginTop: 12 }}>
                <div className="budget-row-top">
                  <span className="budget-label">{loan.paidCount}/{loan.installmentCount} taksit ödendi</span>
                  <span className="mono">{loan.remainingCount} taksit kaldı</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.round((loan.paidCount / loan.installmentCount) * 100)}%`, background: "var(--emerald)" }} /></div>
              </div>

              {loan.nextPaymentDate && (
                <div className="settings-row"><span>Sonraki Ödeme</span><span className="mono">{fmtDate(loan.nextPaymentDate)}</span></div>
              )}

              <button className="btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setExpandedId(expandedId === loan.id ? null : loan.id)}>
                {expandedId === loan.id ? "Taksit Planını Gizle" : "Taksit Planını Göster"}
              </button>

              {expandedId === loan.id && (
                <div className="installment-sub" style={{ marginTop: 8 }}>
                  {loan.schedule.map((l) => <LoanInstallmentLine key={l.id} line={l} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {open && <LoanFormModal onClose={() => setOpen(false)} />}
      {editTarget && <LoanFormModal loan={editTarget} onClose={() => setEditTarget(null)} />}
    </div>
  );
}

function LoanInstallmentLine({ line }) {
  const { dispatch } = useAppData();
  const { toast } = useUI();
  const [payOpen, setPayOpen] = useState(false);
  const [amt, setAmt] = useState("");

  const addPayment = () => {
    const n = Number(amt);
    if (!n || n <= 0) return;
    dispatch({ type: "ADD_PAYMENT_TO_LOAN_LINE", payload: { lineId: line.id, amount: n, date: todayIso() } });
    setPayOpen(false); setAmt("");
    toast("Ödeme kaydedildi.");
  };
  const toggleFullPay = () => {
    if (line.status === "odendi") dispatch({ type: "REMOVE_LAST_PAYMENT_FROM_LOAN_LINE", lineId: line.id });
    else dispatch({ type: "TOGGLE_LOAN_INSTALLMENT_PAID", payload: { lineId: line.id } });
  };

  return (
    <div className="installment-line">
      <span>{line.no}/{line.of}. Taksit · {fmtDate(line.dueDate)}</span>
      <span className="mono">{fmtTL(line.amount)}{line.paid > 0 && line.status !== "odendi" ? <span className="muted"> ({fmtTL(line.paid)} ödendi)</span> : null}</span>
      <span><StatusPill status={line.status} /></span>
      <span className="line-actions">
        {payOpen ? (
          <span className="inline-pay">
            <input type="number" autoFocus value={amt} onChange={(e) => setAmt(e.target.value)} placeholder={String(line.remaining)} style={{ width: 90 }} />
            <button className="pill-btn on" onClick={addPayment}>Ekle</button>
          </span>
        ) : (
          <>
            <button className={`pill-btn ${line.status === "odendi" ? "on" : ""}`} onClick={toggleFullPay}>{line.status === "odendi" ? "Ödendi ✓" : "Tümünü Öde"}</button>
            {line.status !== "odendi" && <button className="pill-btn" onClick={() => setPayOpen(true)}>Kısmi Öde</button>}
            <LoanDueDateEditor line={line} />
          </>
        )}
      </span>
    </div>
  );
}

function LoanDueDateEditor({ line }) {
  const { dispatch } = useAppData();
  const { toast } = useUI();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(line.dueDate);
  const [shiftFollowing, setShiftFollowing] = useState(false);
  if (line.status === "odendi") return null;
  return (
    <span style={{ position: "relative" }}>
      <button className="icon-btn" title="Tarihi değiştir" onClick={() => setOpen((x) => !x)}><Pencil size={13} /></button>
      {open && (
        <div className="date-popover">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <label className="check small"><input type="checkbox" checked={shiftFollowing} onChange={(e) => setShiftFollowing(e.target.checked)} /> Sonraki tüm taksitleri de kaydır</label>
          <button
            className="btn-primary btn-sm"
            onClick={() => {
              dispatch({ type: "SET_LOAN_LINE_DUE_DATE", payload: { lineId: line.id, dueDate: date, shiftFollowing } });
              toast("Tarih güncellendi.");
              setOpen(false);
            }}
          >
            Uygula
          </button>
        </div>
      )}
    </span>
  );
}

function DeleteLoanButton({ loan }) {
  const { dispatch } = useAppData();
  const { toast, confirm } = useUI();
  const remove = async () => {
    const ok = await confirm({ title: "Bu krediyi silmek istediğinize emin misiniz?", message: loan.name, danger: true, confirmLabel: "Sil" });
    if (!ok) return;
    dispatch({ type: "SOFT_DELETE_LOAN", id: loan.id });
    toast("Kredi silindi.", { actionLabel: "Geri Al", onAction: () => dispatch({ type: "RESTORE_LOAN", id: loan.id }) });
  };
  return <button className="icon-btn" onClick={remove}><Trash2 size={15} /></button>;
}

function LoanFormModal({ loan, onClose }) {
  const { dispatch } = useAppData();
  const { toast } = useUI();
  const isEdit = !!loan;
  const [name, setName] = useState(loan?.name || "");
  const [bank, setBank] = useState(loan?.bank || "");
  const [totalAmount, setTotalAmount] = useState(loan ? String(loan.totalAmount) : "");
  const [monthlyPayment, setMonthlyPayment] = useState(loan ? String(loan.monthlyPayment) : "");
  const [installmentCount, setInstallmentCount] = useState(loan ? String(loan.installmentCount) : "12");
  const [interestRate, setInterestRate] = useState(loan ? String(loan.interestRate || "") : "");
  const [firstPaymentDate, setFirstPaymentDate] = useState(loan?.firstPaymentDate || todayIso());
  const [note, setNote] = useState(loan?.note || "");

  const submit = () => {
    if (!name.trim() || !totalAmount || !monthlyPayment || !installmentCount) {
      toast("Kredi adı, toplam tutar, aylık taksit ve taksit sayısı zorunludur.");
      return;
    }
    const payload = {
      name, bank, totalAmount: Number(totalAmount), monthlyPayment: Number(monthlyPayment),
      installmentCount: Number(installmentCount), interestRate: Number(interestRate || 0),
      firstPaymentDate, note,
    };
    if (isEdit) {
      dispatch({ type: "UPDATE_LOAN", payload: { id: loan.id, patch: payload, regenerateSchedule: true } });
      toast("Kredi güncellendi.");
    } else {
      dispatch({ type: "ADD_LOAN", payload });
      toast("Kredi kaydedildi.");
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><Eyebrow>{isEdit ? "Düzenle" : "Yeni Kredi"}</Eyebrow><h3>{isEdit ? loan.name : "Kredi Ekle"}</h3></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <div className="field-grid">
            <label className="field"><span>Kredi Adı</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Konut Kredisi" /></label>
            <label className="field"><span>Banka</span><input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Örn. Garanti BBVA" /></label>
          </div>
          <div className="field-grid field-grid-3">
            <label className="field"><span>Toplam Kredi (₺)</span><input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} /></label>
            <label className="field"><span>Aylık Taksit (₺)</span><input type="number" value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} /></label>
            <label className="field"><span>Taksit Sayısı</span><input type="number" min="1" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} /></label>
          </div>
          <div className="field-grid">
            <label className="field"><span>Faiz Oranı (%)</span><input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} /></label>
            <label className="field"><span>İlk Ödeme Tarihi</span><input type="date" value={firstPaymentDate} onChange={(e) => setFirstPaymentDate(e.target.value)} /></label>
          </div>
          <label className="field"><span>Not</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsiyonel" /></label>
          {isEdit && <div className="alert alert-amber">Düzenlerken zaten ödenmiş taksitler korunur; yalnızca ödenmemiş kısım yeni bilgilere göre yeniden oluşturulur.</div>}
        </div>
        <div className="modal-foot"><button className="btn-ghost" onClick={onClose}>Vazgeç</button><button className="btn-primary" onClick={submit}>Kaydet</button></div>
      </div>
    </div>
  );
}

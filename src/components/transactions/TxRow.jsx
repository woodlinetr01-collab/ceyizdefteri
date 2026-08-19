import React, { useState } from "react";
import { ChevronRight, Pencil, Copy, Trash2, Ban, CalendarClock } from "lucide-react";
import { useAppData } from "../../contexts/AppDataContext.jsx";
import { useUI } from "../../contexts/UIContext.jsx";
import { CATEGORY_MAP } from "../../lib/constants.js";
import { fmtDate, fmtTL, todayIso } from "../../lib/formatUtils.js";
import { catColor } from "../../lib/constants.js";
import { lineStatus, sumPayments } from "../../lib/financeEngine.js";
import { StatusPill } from "../ui/Primitives.jsx";
import AddTransactionModal from "./AddTransactionModal.jsx";

export default function TxRow({ tx, selected, onToggleSelect, selectionMode }) {
  const { state, dispatch, calc } = useAppData();
  const { toast, confirm } = useUI();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [payLineId, setPayLineId] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  const lines = calc.lines.filter((l) => l.tx.id === tx.id);
  const card = tx.cardId ? state.cards.find((c) => c.id === tx.cardId) : null;
  const paidTotal = lines.reduce((s, l) => s + l.paid, 0);
  const overallStatus = paidTotal >= tx.totalAmount ? "odendi" : paidTotal > 0 ? "kismi" : lines.some((l) => l.status === "gecikti") ? "gecikti" : "bekliyor";
  const isMulti = tx.isInstallment && lines.length > 1;

  const remove = async () => {
    const ok = await confirm({ title: "Bu kaydı silmek istediğinize emin misiniz?", message: `"${tx.desc}" kalıcı olarak kaldırılacak (geri alma seçeneğiyle).`, danger: true, confirmLabel: "Sil" });
    if (!ok) return;
    dispatch({ type: "SOFT_DELETE_TRANSACTION", id: tx.id });
    toast("Kayıt silindi.", { actionLabel: "Geri Al", onAction: () => dispatch({ type: "RESTORE_TRANSACTION", id: tx.id }) });
  };

  const addPayment = (lineId) => {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    dispatch({ type: "ADD_PAYMENT_TO_LINE", payload: { lineId, amount: amt, date: todayIso(), method: tx.paymentMethod } });
    toast("Ödeme kaydedildi.");
    setPayLineId(null);
    setPayAmount("");
  };

  const toggleFullPay = (line) => {
    if (line.status === "odendi") {
      dispatch({ type: "REMOVE_LAST_PAYMENT_FROM_LINE", lineId: line.id });
    } else {
      dispatch({ type: "ADD_PAYMENT_TO_LINE", payload: { lineId: line.id, amount: line.remaining, date: todayIso(), method: tx.paymentMethod } });
    }
  };

  return (
    <div className="table-row-wrap">
      <div className="table-row" onClick={() => (isMulti || tx.type === "expense") && setExpanded((x) => !x)}>
        {selectionMode && (
          <span onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(tx.id)} />
          </span>
        )}
        <span className="tx-desc">
          {tx.type === "expense" ? <ChevronRight size={14} className={`chev ${expanded ? "chev-open" : ""}`} /> : <span style={{ width: 14, display: "inline-block" }} />}
          {tx.desc}
          {tx.origin === "recurring" && <span className="tag-soft">düzenli</span>}
        </span>
        <span>{tx.category ? <span className="tag" style={{ "--c": catColor(tx.category) }}>{CATEGORY_MAP[tx.category]?.label}</span> : <span className="muted">—</span>}</span>
        <span className="muted">
          {tx.type === "transfer" ? `${tx.fromAccount} → ${tx.toAccount}` : tx.type === "income" ? tx.source : isMulti ? `Taksit ${lines.filter((l) => l.status === "odendi").length}/${lines.length}` : "Basit"}
          {card ? ` · ${card.name}` : ""}
        </span>
        <span className="muted">{tx.type === "expense" ? tx.paymentMethod : fmtDate(tx.date)}</span>
        <span className="mono ta-r">{fmtTL(tx.totalAmount)}</span>
        <span className="ta-c">
          {tx.type === "income" ? (
            <button className={`pill-btn ${tx.incomeStatus === "Alındı" ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); dispatch({ type: "TOGGLE_INCOME_STATUS", id: tx.id }); }}>{tx.incomeStatus}</button>
          ) : tx.type === "transfer" ? (
            <span className="pill pill-transfer">Transfer</span>
          ) : (
            <StatusPill status={overallStatus} />
          )}
        </span>
        <span className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn" title="Düzenle" onClick={() => setEditing(true)}><Pencil size={14} /></button>
          {tx.type !== "transfer" && <button className="icon-btn" title="Kopyala" onClick={() => setDuplicating(true)}><Copy size={14} /></button>}
          <button className="icon-btn" title="Sil" onClick={remove}><Trash2 size={14} /></button>
        </span>
      </div>

      {expanded && tx.type === "expense" && (
        <div className="installment-sub">
          {lines.map((l) => (
            <div className="installment-line" key={l.id}>
              <span>{l.no === 0 ? "Peşinat" : isMulti ? `${l.no}/${l.of}. Taksit` : "Tutar"} · {fmtDate(l.dueDate)}</span>
              <span className="mono">{fmtTL(l.amount)}{l.paid > 0 && l.status !== "odendi" ? <span className="muted"> ({fmtTL(l.paid)} ödendi)</span> : null}</span>
              <span><StatusPill status={l.status} /></span>
              <span className="line-actions">
                {payLineId === l.id ? (
                  <span className="inline-pay">
                    <input type="number" autoFocus value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={String(l.remaining)} style={{ width: 90 }} />
                    <button className="pill-btn on" onClick={() => addPayment(l.id)}>Ekle</button>
                    <button className="icon-btn" onClick={() => setPayLineId(null)}><Ban size={13} /></button>
                  </span>
                ) : (
                  <>
                    <button className={`pill-btn ${l.status === "odendi" ? "on" : ""}`} onClick={() => toggleFullPay(l)}>{l.status === "odendi" ? "Ödendi ✓" : "Tümünü Öde"}</button>
                    {l.status !== "odendi" && <button className="pill-btn" onClick={() => setPayLineId(l.id)}>Kısmi Öde</button>}
                    <EditDueDate line={l} isMulti={isMulti} />
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {editing && <AddTransactionModal editTransaction={tx} onClose={() => setEditing(false)} />}
      {duplicating && <AddTransactionModal duplicateOf={tx} onClose={() => setDuplicating(false)} />}
    </div>
  );
}

function EditDueDate({ line, isMulti }) {
  const { dispatch } = useAppData();
  const { toast } = useUI();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(line.dueDate);
  const [shiftFollowing, setShiftFollowing] = useState(false);

  if (line.status === "odendi") return null;

  return (
    <span style={{ position: "relative" }}>
      <button className="icon-btn" title="Tarihi değiştir" onClick={() => setOpen((x) => !x)}><CalendarClock size={13} /></button>
      {open && (
        <div className="date-popover">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {isMulti && (
            <label className="check small"><input type="checkbox" checked={shiftFollowing} onChange={(e) => setShiftFollowing(e.target.checked)} /> Sonraki tüm taksitleri de kaydır</label>
          )}
          <button
            className="btn-primary btn-sm"
            onClick={() => {
              dispatch({ type: "SET_LINE_DUE_DATE", payload: { lineId: line.id, dueDate: date, shiftFollowing } });
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

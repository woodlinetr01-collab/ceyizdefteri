import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { SectionTitle, SummaryCard, EmptyState } from "../components/ui/Primitives.jsx";
import AddTransactionModal from "../components/transactions/AddTransactionModal.jsx";
import { fmtTL, fmtDate } from "../lib/formatUtils.js";
import { Wallet, CheckCircle2, Clock, Pencil, Trash2 } from "lucide-react";
import { useUI } from "../contexts/UIContext.jsx";

export default function IncomePage() {
  const { state, dispatch, calc } = useAppData();
  const { toast, confirm } = useUI();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const sorted = state.transactions.filter((t) => t.type === "income" && !t.deletedAt).sort((a, b) => (a.date < b.date ? 1 : -1));

  const remove = async (t) => {
    const ok = await confirm({ title: "Bu geliri silmek istediğinize emin misiniz?", message: t.desc, danger: true, confirmLabel: "Sil" });
    if (!ok) return;
    dispatch({ type: "SOFT_DELETE_TRANSACTION", id: t.id });
    toast("Gelir silindi.", { actionLabel: "Geri Al", onAction: () => dispatch({ type: "RESTORE_TRANSACTION", id: t.id }) });
  };

  return (
    <div className="page">
      <SectionTitle kicker="Gelir Takibi" title="Gelirler" action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Yeni Gelir</button>} />

      <div className="sum-grid sum-grid-3">
        <SummaryCard label="Toplam Beklenen Gelir" value={fmtTL(calc.totalIncomeExpected)} icon={Wallet} tone="ink" />
        <SummaryCard label="Toplam Alınan Gelir" value={fmtTL(calc.totalIncomeReceived)} icon={CheckCircle2} tone="emerald" />
        <SummaryCard label="Bekleyen Gelir" value={fmtTL(calc.totalIncomePending)} icon={Clock} tone="gold" />
      </div>

      <div className="panel">
        <div className="table table-6">
          <div className="table-head"><span>Açıklama</span><span>Kaynak</span><span>Tarih</span><span className="ta-r">Tutar</span><span className="ta-c">Durum</span><span /></div>
          {sorted.length === 0 ? <EmptyState title="Henüz gelir eklemediniz" text='İlk gelirinizi eklemek için "Yeni Gelir" butonuna dokunun.' /> : sorted.map((i) => (
            <div className="table-row" key={i.id}>
              <span>{i.desc}{i.origin === "recurring" && <span className="tag-soft">düzenli</span>}</span>
              <span className="muted">{i.source}</span>
              <span className="muted">{fmtDate(i.date)}</span>
              <span className="mono ta-r">{fmtTL(i.totalAmount)}</span>
              <span className="ta-c"><button className={`pill-btn ${i.incomeStatus === "Alındı" ? "on" : ""}`} onClick={() => dispatch({ type: "TOGGLE_INCOME_STATUS", id: i.id })}>{i.incomeStatus}</button></span>
              <span className="row-actions">
                <button className="icon-btn" onClick={() => setEditing(i)}><Pencil size={14} /></button>
                <button className="icon-btn" onClick={() => remove(i)}><Trash2 size={14} /></button>
              </span>
            </div>
          ))}
        </div>
      </div>
      {open && <AddTransactionModal initialType="income" onClose={() => setOpen(false)} />}
      {editing && <AddTransactionModal editTransaction={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

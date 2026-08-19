import React, { useState } from "react";
import { Plus, X, CreditCard as CardIcon, Trash2 } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useUI } from "../contexts/UIContext.jsx";
import { usePremium } from "../hooks/usePremium.js";
import { SectionTitle, Eyebrow, EmptyState } from "../components/ui/Primitives.jsx";
import { fmtTL } from "../lib/formatUtils.js";

export default function CardsPage() {
  const { state, calc, dispatch } = useAppData();
  const { toast, confirm } = useUI();
  const { guard } = usePremium();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [bank, setBank] = useState(""); const [limit, setLimit] = useState("");
  const [statementDay, setStatementDay] = useState("1"); const [dueDay, setDueDay] = useState("15"); const [existingDebt, setExistingDebt] = useState("0");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const submit = () => {
    if (!guard("addCard").allowed) return;
    if (!name.trim() || !limit) return;
    dispatch({ type: "ADD_CARD", payload: { name, bank, limit: Number(limit), statementDay: Number(statementDay), dueDay: Number(dueDay), existingDebt: Number(existingDebt || 0) } });
    toast("Kart eklendi.");
    setOpen(false); setName(""); setBank(""); setLimit(""); setExistingDebt("0");
  };

  return (
    <div className="page">
      <SectionTitle kicker="Kartlarım" title="Kredi Kartları" action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Kart Ekle</button>} />

      {calc.cardsComputed.length === 0 ? (
        <div className="panel"><EmptyState title="Henüz kart eklemediniz" text='İlk kartınızı eklemek için "Kart Ekle" butonuna dokunun.' /></div>
      ) : (
        <div className="card-grid">
          {calc.cardsComputed.map((c) => {
            const usedPct = c.limit ? Math.min(100, Math.round((c.usedLimit / c.limit) * 100)) : 0;
            return (
              <div className="credit-card" key={c.id}>
                <div className="cc-top">
                  <div><div className="cc-bank">{c.bank}</div><div className="cc-name">{c.name}</div></div>
                  <button className="icon-btn cc-delete" onClick={() => setDeleteTarget(c)}><Trash2 size={16} /></button>
                </div>
                <div className="cc-bar"><div className="cc-bar-fill" style={{ width: `${usedPct}%`, background: usedPct >= 90 ? "var(--rose)" : usedPct >= 80 ? "var(--amber)" : "var(--gold)" }} /></div>
                <div className="cc-row"><span>Kullanım Oranı</span><span className="mono">%{c.usagePct}</span></div>
                <div className="cc-row"><span>Kullanılabilir Limit</span><span className="mono">{fmtTL(c.availableLimit)}</span></div>
                <div className="cc-row cc-strong"><span>Gerçek Borç (Toplam)</span><span className="mono">{fmtTL(c.totalDebt)}</span></div>
                <div className="cc-divider" />
                <div className="cc-row"><span>Mevcut Ekstre</span><span className="mono">{fmtTL(c.thisMonth)}</span></div>
                <div className="cc-row"><span>Gelecek Ay</span><span className="mono">{fmtTL(c.nextMonth)}</span></div>
                <div className="cc-row"><span>Sonraki Aylar</span><span className="mono">{fmtTL(c.monthAfter + c.laterMonths)}</span></div>
                <div className="cc-row"><span>Asgari Ödeme (tahmini)</span><span className="mono">{fmtTL(c.minPayment)}</span></div>
                <div className="cc-foot"><span>Ekstre Kesim: {c.statementDay}. gün</span><span>Son Ödeme: {c.dueDay}. gün</span></div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><div><Eyebrow>Yeni Kart</Eyebrow><h3>Kredi Kartı Ekle</h3></div><button className="icon-btn" onClick={() => setOpen(false)}><X size={18} /></button></div>
            <div className="modal-body">
              <div className="field-grid">
                <label className="field"><span>Kart Adı</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Bonus Card" /></label>
                <label className="field"><span>Banka</span><input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Örn. Garanti BBVA" /></label>
              </div>
              <div className="field-grid field-grid-3">
                <label className="field"><span>Kart Limiti (₺)</span><input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} /></label>
                <label className="field"><span>Ekstre Kesim Günü</span><input type="number" min="1" max="28" value={statementDay} onChange={(e) => setStatementDay(e.target.value)} /></label>
                <label className="field"><span>Son Ödeme Günü</span><input type="number" min="1" max="28" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></label>
              </div>
              <label className="field"><span>Mevcut Borç (bağlantısız, ₺)</span><input type="number" value={existingDebt} onChange={(e) => setExistingDebt(e.target.value)} /></label>
            </div>
            <div className="modal-foot"><button className="btn-ghost" onClick={() => setOpen(false)}>Vazgeç</button><button className="btn-primary" onClick={submit}>Kaydet</button></div>
          </div>
        </div>
      )}

      {deleteTarget && <DeleteCardModal card={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
}

function DeleteCardModal({ card, onClose }) {
  const { state, dispatch, calc } = useAppData();
  const { toast } = useUI();
  const computed = calc.cardsComputed.find((c) => c.id === card.id);
  const linkedCount = computed?.linkedTxCount || 0;
  const otherCards = state.cards.filter((c) => !c.deletedAt && c.id !== card.id);
  const [reassignTo, setReassignTo] = useState(otherCards[0]?.id || "");

  const doDelete = () => {
    dispatch({ type: "DELETE_CARD", payload: { id: card.id, reassignToCardId: linkedCount > 0 ? reassignTo || null : null } });
    toast("Kart silindi.");
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><Eyebrow>Kartı Sil</Eyebrow><h3>{card.name}</h3></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          {linkedCount > 0 ? (
            <>
              <div className="alert alert-amber">Bu karta bağlı {linkedCount} işlem bulunuyor.</div>
              {otherCards.length > 0 ? (
                <label className="field">
                  <span>İşlemleri şu karta taşı</span>
                  <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
                    {otherCards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="">Taşıma — ödeme yöntemini "Diğer" yap</option>
                  </select>
                </label>
              ) : (
                <p className="muted">Başka kartınız yok — bu işlemler "Diğer" ödeme yöntemine taşınacak.</p>
              )}
            </>
          ) : (
            <p>Bu karta bağlı işlem bulunmuyor, güvenle silebilirsiniz.</p>
          )}
        </div>
        <div className="modal-foot"><button className="btn-ghost" onClick={onClose}>Vazgeç</button><button className="btn-danger" onClick={doDelete}>Kartı Sil</button></div>
      </div>
    </div>
  );
}

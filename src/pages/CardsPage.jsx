import React, { useState } from "react";
import { Plus, X, CreditCard as CardIcon, Trash2, Pencil, Banknote } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useUI } from "../contexts/UIContext.jsx";
import { usePremium } from "../hooks/usePremium.js";
import { SectionTitle, Eyebrow, EmptyState } from "../components/ui/Primitives.jsx";
import { fmtTL, fmtDate, todayIso } from "../lib/formatUtils.js";
import { BANK_PRESETS, CARD_NAME_PRESETS, CARD_COLORS } from "../lib/constants.js";

export default function CardsPage() {
  const { calc } = useAppData();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [payTarget, setPayTarget] = useState(null);

  return (
    <div className="page">
      <SectionTitle kicker="Kartlarım" title="Kredi Kartları" action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Kart Ekle</button>} />

      {calc.cardsComputed.length === 0 ? (
        <div className="panel"><EmptyState title="Henüz kart eklemediniz" text='İstediğiniz kadar kart ekleyebilirsiniz — "Kart Ekle" butonuna dokunun.' /></div>
      ) : (
        <div className="card-grid">
          {calc.cardsComputed.map((c) => {
            const usedPct = c.limit ? Math.min(100, Math.round((c.usedLimit / c.limit) * 100)) : 0;
            const bg = c.color || "#152238";
            return (
              <div className="credit-card" key={c.id} style={{ background: `linear-gradient(160deg, ${bg}, color-mix(in srgb, ${bg} 70%, #000))` }}>
                <div className="cc-top">
                  <div>
                    <div className="cc-bank">{c.bank}{c.last4 ? ` · •••• ${c.last4}` : ""}</div>
                    <div className="cc-name">{c.name}</div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <button className="icon-btn cc-delete" title="Düzenle" onClick={() => setEditTarget(c)}><Pencil size={15} /></button>
                    <button className="icon-btn cc-delete" title="Sil" onClick={() => setDeleteTarget(c)}><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="cc-bar"><div className="cc-bar-fill" style={{ width: `${usedPct}%`, background: usedPct >= 90 ? "var(--rose)" : usedPct >= 80 ? "var(--amber)" : "var(--gold)" }} /></div>
                <div className="cc-row"><span>Kullanım Oranı</span><span className="mono">{fmtTL(c.usedLimit)} / {fmtTL(c.limit)} · %{c.usagePct}</span></div>
                <div className="cc-row"><span>Kullanılabilir Limit</span><span className="mono">{fmtTL(c.availableLimit)}</span></div>
                <div className="cc-row cc-strong"><span>Gerçek Borç (Toplam)</span><span className="mono">{fmtTL(c.totalDebt)}</span></div>
                {c.excludedHistoryCount > 0 && (
                  <div className="cc-row" style={{ fontSize: 10.5, opacity: 0.7 }}><span>({c.excludedHistoryCount} geçmiş işlem mevcut borca zaten dahil, tekrar eklenmedi)</span></div>
                )}
                <div className="cc-divider" />
                <div className="cc-row"><span>Mevcut Ekstre</span><span className="mono">{fmtTL(c.thisMonth)}</span></div>
                <div className="cc-row"><span>Gelecek Ay</span><span className="mono">{fmtTL(c.nextMonth)}</span></div>
                <div className="cc-row"><span>Sonraki Aylar</span><span className="mono">{fmtTL(c.monthAfter + c.laterMonths)}</span></div>
                <div className="cc-row"><span>Asgari Ödeme (tahmini)</span><span className="mono">{fmtTL(c.minPayment)}</span></div>
                {c.description && <div className="cc-row" style={{ fontStyle: "italic", opacity: 0.75 }}><span>{c.description}</span></div>}
                <div className="cc-foot"><span>Ekstre Kesim: {c.statementDay}. gün</span><span>Son Ödeme: {c.dueDay}. gün</span></div>
                {c.totalDebt > 0 && (
                  <button className="btn-ghost btn-sm" style={{ marginTop: 8, borderColor: "rgba(255,255,255,0.3)", color: "#fff" }} onClick={() => setPayTarget(c)}>
                    <Banknote size={14} /> Kart Borcu Öde
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && <CardFormModal onClose={() => setOpen(false)} />}
      {editTarget && <CardFormModal card={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && <DeleteCardModal card={deleteTarget} onClose={() => setDeleteTarget(null)} />}
      {payTarget && <PayCardDebtModal card={payTarget} onClose={() => setPayTarget(null)} />}
    </div>
  );
}

function CardFormModal({ card, onClose }) {
  const { dispatch } = useAppData();
  const { toast } = useUI();
  const { guard } = usePremium();
  const isEdit = !!card;

  const [name, setName] = useState(card?.name || "");
  const [bank, setBank] = useState(card?.bank || BANK_PRESETS[0]);
  const [limit, setLimit] = useState(card ? String(card.limit) : "");
  const [statementDay, setStatementDay] = useState(card ? String(card.statementDay) : "1");
  const [dueDay, setDueDay] = useState(card ? String(card.dueDay) : "15");
  const [last4, setLast4] = useState(card?.last4 || "");
  const [color, setColor] = useState(card?.color || CARD_COLORS[0].value);
  const [description, setDescription] = useState(card?.description || "");
  const [existingDebt, setExistingDebt] = useState(card ? String(card.existingDebt) : "0");
  const [includesHistory, setIncludesHistory] = useState(card?.existingDebtIncludesHistory ?? null);

  const submit = () => {
    if (!isEdit && !guard("addCard").allowed) return;
    if (!name.trim() || !limit) { toast("Kart adı ve limit zorunludur."); return; }
    const debtAmount = Number(existingDebt || 0);
    // Mevcut borç girildiyse kullanıcı A/B sorusunu yanıtlamış olmalı (çift
    // sayma hatasını önlemek için — bkz. financeEngine.js cardsComputed).
    if (debtAmount > 0 && includesHistory === null) {
      toast("Lütfen mevcut borcun geçmiş harcamaları içerip içermediğini seçin.");
      return;
    }
    const payload = {
      name, bank, limit: Number(limit), statementDay: Number(statementDay), dueDay: Number(dueDay),
      existingDebt: debtAmount, existingDebtIncludesHistory: debtAmount > 0 ? !!includesHistory : false,
      baselineDate: debtAmount > 0 && includesHistory ? (card?.baselineDate || todayIso()) : null,
      last4: last4.replace(/\D/g, "").slice(0, 4), color, description,
    };
    if (isEdit) {
      dispatch({ type: "UPDATE_CARD", id: card.id, patch: payload });
      toast("Kart güncellendi.");
    } else {
      dispatch({ type: "ADD_CARD", payload });
      toast("Kart başarıyla eklendi.");
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><Eyebrow>{isEdit ? "Düzenle" : "Yeni Kart"}</Eyebrow><h3>{isEdit ? card.name : "Kredi Kartı Ekle"}</h3></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <div className="field-grid">
            <label className="field">
              <span>Kart Adı</span>
              <input list="card-name-presets" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Bonus" />
              <datalist id="card-name-presets">{CARD_NAME_PRESETS.map((n) => <option key={n} value={n} />)}</datalist>
            </label>
            <label className="field">
              <span>Banka</span>
              <select value={bank} onChange={(e) => setBank(e.target.value)}>{BANK_PRESETS.map((b) => <option key={b} value={b}>{b}</option>)}</select>
            </label>
          </div>
          <div className="field-grid field-grid-3">
            <label className="field"><span>Kart Limiti (₺)</span><input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} /></label>
            <label className="field"><span>Ekstre Kesim Günü</span><input type="number" min="1" max="28" value={statementDay} onChange={(e) => setStatementDay(e.target.value)} /></label>
            <label className="field"><span>Son Ödeme Günü</span><input type="number" min="1" max="28" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></label>
          </div>
          <div className="field-grid">
            <label className="field"><span>Son 4 Hane (opsiyonel)</span><input inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" /></label>
            <label className="field">
              <span>Kart Rengi</span>
              <div style={{ display: "flex", gap: 6 }}>
                {CARD_COLORS.map((c) => (
                  <button key={c.key} type="button" onClick={() => setColor(c.value)} title={c.label}
                    style={{ width: 26, height: 26, borderRadius: "50%", background: c.value, border: color === c.value ? "2px solid var(--gold)" : "1px solid var(--line)", cursor: "pointer" }} />
                ))}
              </div>
            </label>
          </div>
          <label className="field"><span>Açıklama (opsiyonel)</span><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Örn. Ortak harcama kartı" /></label>

          <label className="field"><span>Mevcut Borç (₺)</span><input type="number" min="0" value={existingDebt} onChange={(e) => setExistingDebt(e.target.value)} /></label>
          {Number(existingDebt || 0) > 0 && (
            <div className="preview-box" style={{ textAlign: "left" }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Girdiğiniz mevcut borç, kartınızdaki kayıtlı harcamaları içeriyor mu?</div>
              <label className="check" style={{ marginBottom: 6 }}>
                <input type="radio" name="includesHistory" checked={includesHistory === true} onChange={() => setIncludesHistory(true)} />
                Evet, mevcut borç zaten kayıtlı harcamaları içeriyor. (Bu tarihten önceki kart işlemleri borca tekrar eklenmeyecek.)
              </label>
              <label className="check">
                <input type="radio" name="includesHistory" checked={includesHistory === false} onChange={() => setIncludesHistory(false)} />
                Hayır, bu tutar yalnızca ek borç. Kayıtlı harcamalar ayrıca eklenecek.
              </label>
            </div>
          )}
        </div>
        <div className="modal-foot"><button className="btn-ghost" onClick={onClose}>Vazgeç</button><button className="btn-primary" onClick={submit}>Kaydet</button></div>
      </div>
    </div>
  );
}

function DeleteCardModal({ card, onClose }) {
  const { state, dispatch, calc } = useAppData();
  const { toast, confirm } = useUI();
  const computed = calc.cardsComputed.find((c) => c.id === card.id);
  const linkedCount = computed?.linkedTxCount || 0;
  const otherCards = state.cards.filter((c) => !c.deletedAt && c.id !== card.id);
  const [reassignTo, setReassignTo] = useState(otherCards[0]?.id || "");

  const doDelete = async () => {
    const ok = await confirm({ title: "Bu kartı silmek istediğinize emin misiniz?", message: card.name, danger: true, confirmLabel: "Sil" });
    if (!ok) return;
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

/** Kart borcu ödeme: girilen tutar, kartın en eski vadeli ödenmemiş
 * satırlarından başlanarak (FIFO) otomatik dağıtılır. Kaynak alanı yalnızca
 * bilgi amaçlıdır (nakit / başka kart vb.) — orijinal harcama ikinci kez
 * gider olarak sayılmaz, yalnızca o satırın "ödenen" tutarı artar. */
function PayCardDebtModal({ card, onClose }) {
  const { dispatch, state } = useAppData();
  const { toast } = useUI();
  const [amount, setAmount] = useState(String(Math.min(card.thisMonth || card.totalDebt, card.totalDebt)));
  const [date, setDate] = useState(todayIso());
  const [source, setSource] = useState("Banka Hesabından");
  const otherCards = state.cards.filter((c) => !c.deletedAt && c.id !== card.id);

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    dispatch({ type: "PAY_CARD_DEBT", payload: { cardId: card.id, amount: amt, date, note: source } });
    toast(`${fmtTL(amt)} ödeme, en eski vadeli taksitlerden başlanarak kart borcuna işlendi.`);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><Eyebrow>Ödeme</Eyebrow><h3>{card.name} — Borç Öde</h3></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <div className="preview-box">Toplam güncel borç: <b className="mono">{fmtTL(card.totalDebt)}</b>. Girdiğiniz tutar, en eski vadeli ödenmemiş taksitlerden başlanarak otomatik dağıtılır.</div>
          <div className="field-grid">
            <label className="field"><span>Ödeme Tutarı (₺)</span><input type="number" min="0" max={card.totalDebt} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label className="field"><span>Tarih</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          </div>
          <label className="field">
            <span>Kaynak</span>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option>Banka Hesabından</option>
              <option>Nakit</option>
              {otherCards.map((c) => <option key={c.id} value={`${c.name} kartından`}>{c.name} kartından</option>)}
            </select>
          </label>
        </div>
        <div className="modal-foot"><button className="btn-ghost" onClick={onClose}>Vazgeç</button><button className="btn-primary" onClick={submit}>Ödemeyi Kaydet</button></div>
      </div>
    </div>
  );
}

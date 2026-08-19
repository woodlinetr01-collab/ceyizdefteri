import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useAppData } from "../../contexts/AppDataContext.jsx";
import { useUI } from "../../contexts/UIContext.jsx";
import { usePremium } from "../../hooks/usePremium.js";
import { CATEGORIES, PAYMENT_METHODS, INCOME_SOURCES, PERIODS, RECURRING_FREQUENCIES } from "../../lib/constants.js";
import { fmtTL, todayIso } from "../../lib/formatUtils.js";
import { suggestCategory, findPossibleDuplicate } from "../../lib/financeEngine.js";
import { Eyebrow } from "../ui/Primitives.jsx";

export default function AddTransactionModal({ onClose, initialType = "expense", editTransaction = null, duplicateOf = null }) {
  const { state, dispatch } = useAppData();
  const { toast, confirm } = useUI();
  const { guard } = usePremium();
  const navigate = useNavigate();
  const isEdit = !!editTransaction;
  const seed = editTransaction || duplicateOf;

  const [type, setType] = useState(seed?.type || initialType);
  const [group, setGroup] = useState(seed?.group || "dugun");
  const [category, setCategory] = useState(seed?.category || "salon");
  const [desc, setDesc] = useState(seed?.desc || "");
  const [totalAmount, setTotalAmount] = useState(seed?.totalAmount ? String(seed.totalAmount) : "");
  const [date, setDate] = useState(seed && !duplicateOf ? seed.date : todayIso());
  const [isInstallment, setIsInstallment] = useState(seed?.isInstallment || false);
  const [downPayment, setDownPayment] = useState(seed?.downPayment ? String(seed.downPayment) : "0");
  const [installmentCount, setInstallmentCount] = useState(seed?.installmentCount ? String(seed.installmentCount) : "3");
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(seed?.firstInstallmentDate || todayIso());
  const [installmentPeriod, setInstallmentPeriod] = useState(seed?.installmentPeriod || "aylik");
  const [paymentMethod, setPaymentMethod] = useState(seed?.paymentMethod || "Nakit");
  const [cardId, setCardId] = useState(seed?.cardId || state.cards.find((c) => !c.deletedAt)?.id || "");
  const [note, setNote] = useState(seed?.note || "");
  const [incomeSource, setIncomeSource] = useState(seed?.source || "Maaş");
  const [incomeStatus, setIncomeStatus] = useState(seed?.incomeStatus || "Alınmadı");
  const [fromAccount, setFromAccount] = useState(seed?.fromAccount || "Nakit");
  const [toAccount, setToAccount] = useState(seed?.toAccount || "Banka");
  const [recurring, setRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState("monthly");
  const [suggestion, setSuggestion] = useState(null);
  const [dupWarning, setDupWarning] = useState(null);

  const groupCats = CATEGORIES.filter((c) => c.group === group);
  useEffect(() => {
    if (!groupCats.find((c) => c.key === category)) setCategory(groupCats[0]?.key || "diger");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  useEffect(() => {
    if (!isEdit && desc.trim().length > 2) setSuggestion(suggestCategory(desc));
    else setSuggestion(null);
  }, [desc, isEdit]);

  const remaining = Math.max(0, Number(totalAmount || 0) - Number(downPayment || 0));
  const perInstallment = Number(installmentCount) > 0 ? Math.round(remaining / Number(installmentCount)) : 0;

  const checkDuplicate = () => {
    if (isEdit || !desc || !totalAmount) return setDupWarning(null);
    const dup = findPossibleDuplicate(state.transactions, { type, date, totalAmount: Number(totalAmount), desc, cardId: paymentMethod === "Kredi Kartı" ? cardId : null });
    setDupWarning(dup ? `Bu işlem daha önce eklenmiş olabilir: "${dup.desc}" (${dup.date}).` : null);
  };

  const submit = async () => {
    if (!desc.trim() || !totalAmount || Number(totalAmount) <= 0) {
      toast("Açıklama ve tutar zorunludur.");
      return;
    }
    if (!isEdit) {
      const limitCheck = guard(type === "expense" && isInstallment ? "addInstallmentPlan" : "addTransaction");
      if (!limitCheck.allowed) {
        toast(limitCheck.reason, { actionLabel: "Premium'a Bak", onAction: () => { onClose(); navigate("/app/premium"); }, duration: 8000 });
        return;
      }
      const dup = findPossibleDuplicate(state.transactions, { type, date, totalAmount: Number(totalAmount), desc, cardId: paymentMethod === "Kredi Kartı" ? cardId : null });
      if (dup) {
        const ok = await confirm({ title: "Mükerrer kayıt olabilir", message: `"${dup.desc}" işlemine çok benziyor (${dup.date}). Yine de eklemek istiyor musunuz?`, confirmLabel: "Yine de Ekle" });
        if (!ok) return;
      }
    }

    if (type === "transfer") {
      const payload = { type: "transfer", desc, totalAmount: Number(totalAmount), date, fromAccount, toAccount, note };
      if (isEdit) dispatch({ type: "UPDATE_TRANSACTION", payload: { id: editTransaction.id, patch: payload } });
      else dispatch({ type: "ADD_TRANSFER", payload });
      toast("Transfer kaydedildi.");
      onClose();
      return;
    }

    if (type === "income") {
      const payload = { desc, totalAmount: Number(totalAmount), date, source: incomeSource, incomeStatus };
      if (isEdit) dispatch({ type: "UPDATE_TRANSACTION", payload: { id: editTransaction.id, patch: payload } });
      else dispatch({ type: "ADD_INCOME", payload });
      if (recurring && !isEdit) {
        dispatch({ type: "ADD_RECURRING", payload: { kind: "income", desc, amount: Number(totalAmount), category: null, group: null, paymentMethod: null, cardId: null, startDate: date, frequency: recurringFreq, endDate: null } });
        dispatch({ type: "APPLY_RECURRING" });
      }
      toast(isEdit ? "Gelir güncellendi." : "Gelir eklendi.");
      onClose();
      return;
    }

    const payload = {
      type: "expense", group, category, desc, totalAmount: Number(totalAmount),
      paymentMethod, cardId: paymentMethod === "Kredi Kartı" ? cardId : null, note,
      isInstallment, downPayment: isInstallment ? Number(downPayment || 0) : 0,
      installmentCount: isInstallment ? Number(installmentCount) : 1,
      firstInstallmentDate: isInstallment ? firstInstallmentDate : date,
      installmentPeriod, date,
    };
    if (isEdit) {
      dispatch({ type: "UPDATE_TRANSACTION", payload: { id: editTransaction.id, patch: payload, regenerateInstallments: true } });
      toast("İşlem güncellendi.");
    } else {
      dispatch({ type: "ADD_TRANSACTION", payload });
      if (recurring) {
        dispatch({ type: "ADD_RECURRING", payload: { kind: "expense", desc, amount: Number(totalAmount), category, group, paymentMethod, cardId: paymentMethod === "Kredi Kartı" ? cardId : null, startDate: date, frequency: recurringFreq, endDate: null } });
        dispatch({ type: "APPLY_RECURRING" });
      }
      toast("Gider eklendi.");
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <Eyebrow>{isEdit ? "Düzenle" : duplicateOf ? "Kopyala" : "Yeni Kayıt"}</Eyebrow>
            <h3>{isEdit ? "İşlemi Düzenle" : "İşlem Ekle"}</h3>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {!isEdit && (
            <div className="seg">
              <button className={type === "expense" ? "active" : ""} onClick={() => setType("expense")}>Gider</button>
              <button className={type === "income" ? "active" : ""} onClick={() => setType("income")}>Gelir</button>
              <button className={type === "transfer" ? "active" : ""} onClick={() => setType("transfer")}>Transfer</button>
            </div>
          )}

          <div className="field-grid">
            <label className="field">
              <span>Açıklama</span>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={checkDuplicate} placeholder={type === "expense" ? "Örn. Fotoğrafçı" : type === "income" ? "Örn. Ağustos Maaşı" : "Örn. Nakitten Bankaya"} />
            </label>
            <label className="field">
              <span>Tutar (₺)</span>
              <input type="number" min="0" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} onBlur={checkDuplicate} placeholder="0" />
            </label>
          </div>
          {suggestion && type === "expense" && category !== suggestion && (
            <button type="button" className="preview-box preview-suggest" onClick={() => setCategory(suggestion)}>
              Önerilen kategori: <b>{CATEGORIES.find((c) => c.key === suggestion)?.label}</b> — uygulamak için tıklayın
            </button>
          )}
          {dupWarning && <div className="alert alert-amber" style={{ marginTop: -4 }}>{dupWarning}</div>}

          {type === "expense" && (
            <>
              <div className="field-grid">
                <label className="field">
                  <span>Grup</span>
                  <select value={group} onChange={(e) => setGroup(e.target.value)}>
                    <option value="dugun">Düğün</option>
                    <option value="ev">Ev Kurma</option>
                    <option value="diger">Diğer</option>
                  </select>
                </label>
                <label className="field">
                  <span>Kategori</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {groupCats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="seg">
                <button className={!isInstallment ? "active" : ""} onClick={() => setIsInstallment(false)}>Peşin / Basit</button>
                <button className={isInstallment ? "active" : ""} onClick={() => setIsInstallment(true)}>Taksitli</button>
              </div>

              {!isInstallment ? (
                <label className="field"><span>Tarih</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              ) : (
                <>
                  <div className="field-grid">
                    <label className="field"><span>Peşinat (₺)</span><input type="number" min="0" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} /></label>
                    <label className="field"><span>Peşinat / İşlem Tarihi</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
                  </div>
                  <div className="field-grid field-grid-3">
                    <label className="field"><span>Taksit Sayısı</span><input type="number" min="1" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} /></label>
                    <label className="field"><span>İlk Taksit Tarihi</span><input type="date" value={firstInstallmentDate} onChange={(e) => setFirstInstallmentDate(e.target.value)} /></label>
                    <label className="field"><span>Periyot</span><select value={installmentPeriod} onChange={(e) => setInstallmentPeriod(e.target.value)}>{PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select></label>
                  </div>
                  <div className="preview-box">Kalan {fmtTL(remaining)} → {installmentCount || 0} taksit × <b className="mono">{fmtTL(perInstallment)}</b></div>
                  {isEdit && <div className="alert alert-amber">Düzenlerken zaten ödenmiş taksitler korunur; yalnızca ödenmemiş kısım yeni plana göre yeniden oluşturulur.</div>}
                </>
              )}

              <div className="field-grid">
                <label className="field">
                  <span>Ödeme Yöntemi</span>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
                </label>
                {paymentMethod === "Kredi Kartı" ? (
                  <label className="field">
                    <span>Kredi Kartı</span>
                    <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
                      {state.cards.filter((c) => !c.deletedAt).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                ) : (
                  <label className="field"><span>Not</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsiyonel" /></label>
                )}
              </div>

              {!isEdit && !isInstallment && (
                <label className="check"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Düzenli gider olarak tekrarla</label>
              )}
              {recurring && (
                <label className="field"><span>Tekrar Sıklığı</span><select value={recurringFreq} onChange={(e) => setRecurringFreq(e.target.value)}>{RECURRING_FREQUENCIES.filter((f) => f.key !== "custom").map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></label>
              )}
            </>
          )}

          {type === "income" && (
            <>
              <div className="field-grid">
                <label className="field"><span>Gelir Kaynağı</span><select value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)}>{INCOME_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
                <label className="field"><span>Tarih</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              </div>
              <label className="field field-check">
                <span>Durum</span>
                <div className="seg seg-small">
                  <button type="button" className={incomeStatus === "Alındı" ? "active" : ""} onClick={() => setIncomeStatus("Alındı")}>Alındı</button>
                  <button type="button" className={incomeStatus === "Alınmadı" ? "active" : ""} onClick={() => setIncomeStatus("Alınmadı")}>Alınmadı</button>
                </div>
              </label>
              {!isEdit && (
                <>
                  <label className="check"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Düzenli gelir olarak tekrarla</label>
                  {recurring && (
                    <label className="field"><span>Tekrar Sıklığı</span><select value={recurringFreq} onChange={(e) => setRecurringFreq(e.target.value)}>{RECURRING_FREQUENCIES.filter((f) => f.key !== "custom").map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></label>
                  )}
                </>
              )}
            </>
          )}

          {type === "transfer" && (
            <>
              <div className="field-grid">
                <label className="field"><span>Kaynak Hesap</span><input value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} placeholder="Örn. Nakit" /></label>
                <label className="field"><span>Hedef Hesap</span><input value={toAccount} onChange={(e) => setToAccount(e.target.value)} placeholder="Örn. Banka" /></label>
              </div>
              <label className="field"><span>Tarih</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <div className="alert alert-green">Transferler gelir/gider toplamlarınızı etkilemez, yalnızca kayıt altına alınır.</div>
            </>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn-primary" onClick={submit}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}

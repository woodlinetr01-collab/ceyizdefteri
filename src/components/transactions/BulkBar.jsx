import React, { useState } from "react";
import { CATEGORIES } from "../../lib/constants.js";
import { useAppData } from "../../contexts/AppDataContext.jsx";
import { useUI } from "../../contexts/UIContext.jsx";

export default function BulkBar({ selectedIds, onClear, allSelected, onToggleAll }) {
  const { dispatch } = useAppData();
  const { toast, confirm } = useUI();
  const [categoryPick, setCategoryPick] = useState("");

  if (selectedIds.length === 0) return null;

  const bulkDelete = async () => {
    const ok = await confirm({ title: "Seçilenleri sil", message: `${selectedIds.length} kayıt silinecek. Emin misiniz?`, danger: true, confirmLabel: "Sil" });
    if (!ok) return;
    dispatch({ type: "BULK_DELETE_TRANSACTIONS", ids: selectedIds });
    toast(`${selectedIds.length} kayıt silindi.`);
    onClear();
  };
  const bulkCategory = () => {
    if (!categoryPick) return;
    dispatch({ type: "BULK_SET_CATEGORY", ids: selectedIds, category: categoryPick });
    toast("Kategori güncellendi.");
    onClear();
  };
  const bulkMarkPaid = () => {
    dispatch({ type: "BULK_MARK_PAID", ids: selectedIds });
    toast("Seçilenler ödendi olarak işaretlendi.");
    onClear();
  };

  return (
    <div className="bulk-bar">
      <label className="check"><input type="checkbox" checked={allSelected} onChange={onToggleAll} /> Tümünü Seç</label>
      <span className="muted">{selectedIds.length} seçili</span>
      <select value={categoryPick} onChange={(e) => setCategoryPick(e.target.value)}>
        <option value="">Kategori değiştir…</option>
        {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <button className="btn-ghost btn-sm" disabled={!categoryPick} onClick={bulkCategory}>Uygula</button>
      <button className="btn-ghost btn-sm" onClick={bulkMarkPaid}>Ödendi İşaretle</button>
      <button className="btn-danger btn-sm" onClick={bulkDelete}>Seçilenleri Sil</button>
      <button className="icon-btn" onClick={onClear}>Vazgeç</button>
    </div>
  );
}

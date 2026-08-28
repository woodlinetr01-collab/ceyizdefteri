import React, { useMemo, useState } from "react";
import { Plus, Search, CheckSquare } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { SectionTitle, EmptyState } from "../components/ui/Primitives.jsx";
import TxRow from "../components/transactions/TxRow.jsx";
import BulkBar from "../components/transactions/BulkBar.jsx";
import AddTransactionModal from "../components/transactions/AddTransactionModal.jsx";
import { CATEGORY_MAP, PAYMENT_METHODS } from "../lib/constants.js";

export default function TransactionsPage() {
  const { state } = useAppData();
  const [query, setQuery] = useState("");
  const [fType, setFType] = useState("all");
  const [fGroup, setFGroup] = useState("all");
  const [fMethod, setFMethod] = useState("all");
  const [open, setOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState([]);

  const rows = useMemo(() => {
    return state.transactions
      .filter((t) => !t.deletedAt)
      .filter((t) => (fType === "all" ? true : t.type === fType))
      .filter((t) => (fGroup === "all" ? true : t.group === fGroup))
      .filter((t) => (fMethod === "all" ? true : t.paymentMethod === fMethod))
      .filter((t) => (query.trim() ? (t.desc + " " + (CATEGORY_MAP[t.category]?.label || "") + " " + (t.paymentMethod || "") + " " + String(t.totalAmount)).toLowerCase().includes(query.toLowerCase()) : true))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [state.transactions, fType, fGroup, fMethod, query]);

  const toggleSelect = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="page">
      <SectionTitle
        kicker="Kayıt Defteri"
        title="Tüm İşlemler"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={() => { setSelectionMode((x) => !x); setSelected([]); }}><CheckSquare size={16} /> {selectionMode ? "Seçimi Kapat" : "Seç"}</button>
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Yeni İşlem</button>
          </div>
        }
      />

      <div className="filter-bar">
        <div className="search-box"><Search size={15} /><input placeholder="mobilya, garanti, fotoğrafçı, 15.000…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <select value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="all">Tüm Tipler</option><option value="expense">Gider</option><option value="income">Gelir</option><option value="transfer">Transfer</option>
        </select>
        <select value={fGroup} onChange={(e) => setFGroup(e.target.value)}>
          <option value="all">Tüm Gruplar</option><option value="dugun">Düğün</option><option value="ev">Ev Kurma</option><option value="diger">Diğer</option>
        </select>
        <select value={fMethod} onChange={(e) => setFMethod(e.target.value)}>
          <option value="all">Tüm Yöntemler</option>{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {selectionMode && <BulkBar selectedIds={selected} onClear={() => setSelected([])} allSelected={allSelected} onToggleAll={() => setSelected(allSelected ? [] : rows.map((r) => r.id))} />}

      <div className="panel">
        <div className="table">
          <div className="table-head">
            {selectionMode && <span />}
            <span>İşlem</span><span>Kategori</span><span>Detay</span><span>Yöntem/Tarih</span><span className="ta-r">Tutar</span><span className="ta-c">Durum</span><span />
          </div>
          {rows.length === 0 ? <EmptyState title="Henüz işlem yok" text='İlk kaydınızı eklemek için "Yeni İşlem" butonuna dokunun.' /> : rows.map((t) => (
            <TxRow key={t.id} tx={t} selected={selected.includes(t.id)} onToggleSelect={toggleSelect} selectionMode={selectionMode} />
          ))}
        </div>
      </div>

      {open && <AddTransactionModal onClose={() => setOpen(false)} />}
    </div>
  );
}

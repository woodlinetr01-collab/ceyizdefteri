import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Heart, Home as HomeIcon, Landmark, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { usePremium } from "../hooks/usePremium.js";
import { useUI } from "../contexts/UIContext.jsx";
import { SectionTitle } from "../components/ui/Primitives.jsx";
import { fmtTL } from "../lib/formatUtils.js";
import { exportTransactionsCsv, exportBackupJsonFile, exportExcel, exportPdfReport } from "../services/exportService.js";

export default function ReportsPage() {
  const { state, calc } = useAppData();
  const { guard } = usePremium();
  const { toast } = useUI();
  const [busy, setBusy] = useState(null);

  const thisIdx = calc.monthlyFlow.findIndex((m) => m.key === calc.thisMonthKeyStr);
  const prev = calc.monthlyFlow[thisIdx - 1];
  const curr = calc.monthlyFlow[thisIdx];
  const pctChange = prev && prev.Gider > 0 ? Math.round(((curr.Gider - prev.Gider) / prev.Gider) * 100) : 0;
  const dugunTotal = calc.budgetProgress.filter((b) => b.group === "dugun").reduce((s, b) => s + b.actual, 0);
  const evTotal = calc.budgetProgress.filter((b) => b.group === "ev").reduce((s, b) => s + b.actual, 0);
  const yearIncome = calc.monthlyFlow.reduce((s, m) => s + m.Gelir, 0);
  const yearExpense = calc.monthlyFlow.reduce((s, m) => s + m.Gider, 0);

  const doExcel = async () => {
    if (!guard("exportPdfExcel").allowed) return;
    setBusy("excel");
    try { await exportExcel(state, calc); toast("Excel dosyası indirildi."); }
    catch (e) { toast("Excel oluşturulamadı: " + e.message); }
    setBusy(null);
  };
  const doPdf = async () => {
    if (!guard("exportPdfExcel").allowed) return;
    setBusy("pdf");
    try { await exportPdfReport(state, calc); toast("PDF rapor indirildi."); }
    catch (e) { toast("PDF oluşturulamadı: " + e.message); }
    setBusy(null);
  };

  return (
    <div className="page">
      <SectionTitle
        kicker="Özet"
        title="Raporlar"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost btn-sm" onClick={() => exportTransactionsCsv(calc)}><Download size={14} /> CSV</button>
            <button className="btn-ghost btn-sm" onClick={() => exportBackupJsonFile(state)}><Download size={14} /> JSON Yedek</button>
            <button className="btn-ghost btn-sm" onClick={doExcel} disabled={busy === "excel"}><FileSpreadsheet size={14} /> {busy === "excel" ? "Hazırlanıyor…" : "Excel (Premium)"}</button>
            <button className="btn-ghost btn-sm" onClick={doPdf} disabled={busy === "pdf"}><FileText size={14} /> {busy === "pdf" ? "Hazırlanıyor…" : "PDF (Premium)"}</button>
          </div>
        }
      />

      <div className="panel insight-panel">
        <div className="insight-row"><TrendingUp size={16} className={pctChange >= 0 ? "text-rose" : "text-emerald"} /><span>Bu ay geçen aya göre <b>%{Math.abs(pctChange)}</b> {pctChange >= 0 ? "daha fazla" : "daha az"} harcama yaptınız.</span></div>
        <div className="insight-row"><Heart size={16} className="text-gold" /><span>Düğün için şimdiye kadar <b className="mono">{fmtTL(dugunTotal)}</b> harcandı.</span></div>
        <div className="insight-row"><HomeIcon size={16} className="text-emerald" /><span>Ev kurma için şimdiye kadar <b className="mono">{fmtTL(evTotal)}</b> harcandı.</span></div>
        <div className="insight-row"><Landmark size={16} className="text-sky" /><span>Önümüzdeki 12 ay toplam ödeme yükümlülüğü <b className="mono">{fmtTL(calc.next12MonthsTotal)}</b>.</span></div>
      </div>

      <div className="sum-grid sum-grid-2">
        <div className="panel"><div className="eyebrow">Yıllık (görüntülenen 12 ay)</div><div className="report-big">{fmtTL(yearIncome)} <span className="muted">gelir</span></div></div>
        <div className="panel"><div className="eyebrow">Yıllık (görüntülenen 12 ay)</div><div className="report-big">{fmtTL(yearExpense)} <span className="muted">gider</span></div></div>
      </div>

      <div className="two-col">
        <div className="panel">
          <SectionTitle kicker="Yük Dağılımı" title="Gelecek Aylardaki Ödeme Yükü" />
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={calc.futureLoad} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="2 6" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--ink-60)" }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--ink-60)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => fmtTL(v)} />
              <Bar dataKey="Tutar" fill="var(--gold)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <SectionTitle kicker="Kartlar" title="Kredi Kartı Analizi" />
          <div className="table table-3">
            <div className="table-head"><span>Kart</span><span className="ta-r">Bu Ekstre</span><span className="ta-r">Toplam Borç</span></div>
            {calc.cardsComputed.map((c) => (<div className="table-row" key={c.id}><span>{c.name}</span><span className="mono ta-r">{fmtTL(c.thisMonth)}</span><span className="mono ta-r">{fmtTL(c.totalDebt)}</span></div>))}
          </div>
        </div>
      </div>

      <div className="panel">
        <SectionTitle kicker="Kategoriler" title="Kategori Analizi" />
        <div className="report-cat-list">
          {calc.categoryBreakdown.slice().sort((a, b) => b.value - a.value).map((c) => (
            <div className="report-cat-row" key={c.key}><span className="dot" style={{ background: c.color }} /><span className="legend-label">{c.label}</span><span className="mono">{fmtTL(c.value)}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

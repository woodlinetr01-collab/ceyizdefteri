import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ReceiptText, CheckCircle2, Clock, PiggyBank, TrendingDown, TrendingUp, ArrowLeftRight, CalendarDays, CreditCard as CardIcon, Landmark, Scale } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { SummaryCard, SectionTitle, EmptyState, Eyebrow, SegmentedControl } from "../components/ui/Primitives.jsx";
import { fmtTL } from "../lib/formatUtils.js";
import { CATEGORY_MAP } from "../lib/constants.js";

const COLORS = { emerald: "#1E7A5C", rose: "#B5423A", line: "var(--line)" };
const FONT = { body: "Inter, sans-serif", mono: "IBM Plex Mono, monospace" };

export default function DashboardPage() {
  const { calc } = useAppData();
  const [upTab, setUpTab] = useState(7);
  const upList = calc.upcoming(upTab);

  return (
    <div className="page">
      <SectionTitle kicker="Genel Bakış" title="Finans Panosu" />

      <div className="sum-grid">
        <SummaryCard label="Kullanılabilir Bakiye" value={fmtTL(calc.availableBalance)} icon={PiggyBank} tone={calc.availableBalance < 0 ? "rose" : "ink"} />
        <SummaryCard label="Net Finansal Durum" value={fmtTL(calc.netWorth)} icon={Scale} tone={calc.netWorth < 0 ? "rose" : "emerald"} />
        <SummaryCard label="Toplam Borç" value={fmtTL(calc.totalDebtOverall)} icon={TrendingDown} tone="rose" />
        <SummaryCard label="Toplam Alacak" value={fmtTL(calc.receivable)} icon={TrendingUp} tone="emerald" />
        <SummaryCard label="Bu Ay Gelir" value={fmtTL(calc.thisMonthIncome)} icon={ArrowLeftRight} tone="ink" />
        <SummaryCard label="Bu Ay Gider" value={fmtTL(calc.thisMonthExpense)} icon={ReceiptText} tone="ink" />
        <SummaryCard label="Bu Ay Net" value={fmtTL(calc.thisMonthIncome - calc.thisMonthExpense)} tone={calc.thisMonthIncome - calc.thisMonthExpense < 0 ? "rose" : "emerald"} />
        <SummaryCard label="Kredi Kartı Borcu" value={fmtTL(calc.creditCardDebtTotal)} icon={CardIcon} tone="rose" />
        <SummaryCard label="Bu Ay Taksit" value={fmtTL(calc.thisMonthInstallmentDue)} icon={CalendarDays} tone="gold" />
        <SummaryCard label="Önümüzdeki 30 Gün Ödemesi" value={fmtTL(calc.upcoming(30).reduce((s, l) => s + l.remaining, 0))} icon={Landmark} tone="sky" />
      </div>

      <div className="two-col">
        <div className="panel">
          <SectionTitle kicker="Nakit Akışı" title="Gelir · Gider (12 Ay)" />
          {calc.monthlyFlow.every((m) => m.Gelir === 0 && m.Gider === 0) ? (
            <EmptyState text="Henüz görüntülenecek veri yok." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={calc.monthlyFlow} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gGelir" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.35} /><stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0.02} /></linearGradient>
                  <linearGradient id="gGider" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.rose} stopOpacity={0.3} /><stop offset="100%" stopColor={COLORS.rose} stopOpacity={0.02} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 6" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--ink-60)" }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--ink-60)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => fmtTL(v)} />
                <Area type="monotone" dataKey="Gelir" stroke={COLORS.emerald} fill="url(#gGelir)" strokeWidth={2} />
                <Area type="monotone" dataKey="Gider" stroke={COLORS.rose} fill="url(#gGider)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel">
          <SectionTitle kicker="Dağılım" title="Kategori Bazlı Gider" />
          {calc.categoryBreakdown.length === 0 ? (
            <EmptyState text="Henüz kategori bazlı bir gideriniz yok." />
          ) : (
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={calc.categoryBreakdown} dataKey="value" nameKey="label" innerRadius={54} outerRadius={88} paddingAngle={1.5}>
                    {calc.categoryBreakdown.map((c) => <Cell key={c.key} fill={c.color} stroke="var(--paper)" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtTL(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="legend-list">
                {calc.categoryBreakdown.slice().sort((a, b) => b.value - a.value).slice(0, 6).map((c) => (
                  <div key={c.key} className="legend-row"><span className="dot" style={{ background: c.color }} /><span className="legend-label">{c.label}</span><span className="mono legend-value">{fmtTL(c.value)}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <SectionTitle kicker="Ledger" title="Yaklaşan Ödemeler" action={<SegmentedControl small value={upTab} onChange={setUpTab} options={[{ value: 7, label: "7 Gün" }, { value: 30, label: "30 Gün" }, { value: 90, label: "90 Gün" }]} />} />
          <div className="ledger">
            {upList.length === 0 ? <EmptyState text="Bu aralıkta ödeme bulunmuyor." /> : upList.slice(0, 10).map((l, idx) => (
              <div className="ledger-row" key={idx}>
                <div className="ledger-date"><span className="ledger-day">{l.dueDate.slice(8, 10)}</span><span className="ledger-month">{l.dueDate.slice(5, 7)}/{l.dueDate.slice(2, 4)}</span></div>
                <div className="ledger-mid"><div className="ledger-desc">{l.tx.desc}{l.of > 1 ? <span className="ledger-tag"> · {l.no}/{l.of}. taksit</span> : null}</div><div className="ledger-cat">{CATEGORY_MAP[l.tx.category]?.label}</div></div>
                <div className="mono ledger-amount">{fmtTL(l.remaining)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <SectionTitle kicker="Uyarılar" title="Akıllı Bildirimler" />
          <div className="alert-list">
            {calc.alerts.length === 0 ? <EmptyState text="Şu anda bildirim yok." /> : calc.alerts.slice(0, 8).map((a, idx) => (
              <div key={idx} className={`alert alert-${a.level}`}><span>{a.text}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

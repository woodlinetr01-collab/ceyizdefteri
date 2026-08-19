import React, { useState } from "react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { SectionTitle, SummaryCard, EmptyState } from "../components/ui/Primitives.jsx";
import { fmtTL } from "../lib/formatUtils.js";
import { catColor, CATEGORIES } from "../lib/constants.js";
import { ArrowLeftRight, CheckCircle2 } from "lucide-react";

export default function BudgetPage({ group, title, kicker, icon: Icon }) {
  const { state, calc, dispatch } = useAppData();
  const rows = calc.budgetProgress.filter((b) => b.group === group);
  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const pctPlanned = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  const allCatsInGroup = CATEGORIES.filter((c) => c.group === group);
  const missingCats = allCatsInGroup.filter((c) => !state.categoryBudgets[c.key]);

  return (
    <div className="page">
      <SectionTitle kicker={kicker} title={title} />
      <div className="sum-grid sum-grid-3">
        <SummaryCard label="Toplam Bütçe" value={fmtTL(totalPlanned)} icon={Icon} tone="ink" />
        <SummaryCard label="Gerçekleşen" value={fmtTL(totalActual)} sub={`Bütçenin %${pctPlanned}'i`} icon={ArrowLeftRight} tone={totalActual > totalPlanned ? "rose" : "gold"} />
        <SummaryCard label="Ödenen" value={fmtTL(totalPaid)} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="panel">
        <div className="budget-list">
          {rows.length === 0 ? <EmptyState title="Bu grupta henüz kayıt yok" text="Bir gider eklediğinizde burada otomatik görünecek." /> : rows.map((r) => {
            const pct = r.planned > 0 ? Math.min(100, Math.round((r.actual / r.planned) * 100)) : 0;
            return (
              <div className="budget-row" key={r.key}>
                <div className="budget-row-top">
                  <span className="budget-label"><span className="dot" style={{ background: catColor(r.key) }} />{r.label}</span>
                  <span className="mono">{fmtTL(r.actual)} <span className="muted">/ {fmtTL(r.planned)}</span></span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%`, background: r.over > 0 ? "var(--rose)" : catColor(r.key) }} /></div>
                <div className="budget-row-bot">
                  <span className="muted">Ödenen: <b className="mono">{fmtTL(r.paid)}</b></span>
                  <span className={r.over > 0 ? "over-text" : "muted"}>{r.over > 0 ? `${fmtTL(r.over)} aşıldı` : `Kalan: ${fmtTL(r.remaining)}`}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {missingCats.length > 0 && (
        <div className="panel">
          <h3 className="panel-h">Planlanan Bütçe Belirle</h3>
          <div className="budget-plan-grid">
            {missingCats.map((c) => <BudgetPlanRow key={c.key} categoryKey={c.key} label={c.label} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function BudgetPlanRow({ categoryKey, label }) {
  const { dispatch } = useAppData();
  const [value, setValue] = useState("");
  return (
    <div className="budget-plan-row">
      <span>{label}</span>
      <input type="number" placeholder="Planlanan ₺" value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn-ghost btn-sm" disabled={!value} onClick={() => { dispatch({ type: "SET_BUDGET", category: categoryKey, amount: Number(value) }); setValue(""); }}>Kaydet</button>
    </div>
  );
}

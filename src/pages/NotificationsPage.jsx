import React from "react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { SectionTitle, EmptyState } from "../components/ui/Primitives.jsx";
import { fmtTL, fmtDate } from "../lib/formatUtils.js";
import { AlertTriangle, Clock, CheckCircle2, CreditCard, Wallet, PiggyBank, Landmark } from "lucide-react";

const ICONS = { payment: Clock, card: CreditCard, budget: PiggyBank, cashflow: Wallet, loan: Landmark };

export default function NotificationsPage() {
  const { calc } = useAppData();
  const upcoming7 = calc.upcoming(7);

  return (
    <div className="page">
      <SectionTitle kicker="Bildirim Merkezi" title="Bildirimler" />

      <div className="panel">
        <h3 className="panel-h">Akıllı Uyarılar</h3>
        <div className="alert-list">
          {calc.alerts.length === 0 ? <EmptyState text="Şu anda bildirim yok." /> : calc.alerts.map((a, idx) => {
            const Icon = ICONS[a.type] || AlertTriangle;
            return <div key={idx} className={`alert alert-${a.level}`}><Icon size={15} /><span>{a.text}</span></div>;
          })}
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-h">7 Gün İçindeki Ödemeler</h3>
        <div className="ledger">
          {upcoming7.length === 0 ? <EmptyState text="Önümüzdeki 7 günde ödeme yok." /> : upcoming7.map((l, idx) => (
            <div className="ledger-row" key={idx}>
              <div className="ledger-date"><span className="ledger-day">{l.dueDate.slice(8, 10)}</span></div>
              <div className="ledger-mid"><div className="ledger-desc">{l.tx.desc}</div></div>
              <div className="mono ledger-amount">{fmtTL(l.remaining)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-h">Gecikmiş Ödemeler</h3>
        <div className="ledger">
          {calc.overdue.length === 0 ? <div className="alert alert-green"><CheckCircle2 size={15} /><span>Gecikmiş ödemeniz yok.</span></div> : calc.overdue.map((l, idx) => (
            <div className="ledger-row" key={idx}>
              <div className="ledger-date"><span className="ledger-day">{l.dueDate.slice(8, 10)}</span></div>
              <div className="ledger-mid"><div className="ledger-desc">{l.tx.desc}</div><div className="ledger-cat">Vade: {fmtDate(l.dueDate)}</div></div>
              <div className="mono ledger-amount">{fmtTL(l.remaining)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

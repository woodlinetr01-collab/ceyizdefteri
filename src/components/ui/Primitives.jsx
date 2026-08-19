import React from "react";
import { CheckCircle2, Clock, AlertTriangle, Ban } from "lucide-react";

export function Eyebrow({ children }) {
  return <div className="eyebrow">{children}</div>;
}

export function SectionTitle({ kicker, title, action }) {
  return (
    <div className="section-title">
      <div>
        {kicker ? <Eyebrow>{kicker}</Eyebrow> : null}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function SummaryCard({ label, value, sub, tone = "ink", icon: Icon }) {
  return (
    <div className={`sum-card tone-${tone}`}>
      <div className="sum-top">
        <Eyebrow>{label}</Eyebrow>
        {Icon ? <Icon size={16} strokeWidth={1.6} /> : null}
      </div>
      <div className="sum-value">{value}</div>
      {sub ? <div className="sum-sub">{sub}</div> : null}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      {title ? <div className="empty-state-title">{title}</div> : null}
      <div>{text}</div>
      {action}
    </div>
  );
}

const STATUS_META = {
  odendi: { label: "Ödendi", icon: CheckCircle2, cls: "pill-paid" },
  kismi: { label: "Kısmi Ödendi", icon: Clock, cls: "pill-partial" },
  gecikti: { label: "Gecikti", icon: AlertTriangle, cls: "pill-late" },
  bekliyor: { label: "Bekliyor", icon: Clock, cls: "pill-unpaid" },
  iptal: { label: "İptal", icon: Ban, cls: "pill-cancelled" },
};
export function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.bekliyor;
  const Icon = meta.icon;
  return (
    <span className={`pill ${meta.cls}`}>
      <Icon size={13} /> {meta.label}
    </span>
  );
}

export function SegmentedControl({ value, onChange, options, small }) {
  return (
    <div className={`seg ${small ? "seg-small" : ""}`}>
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "active" : ""} onClick={() => onChange(o.value)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

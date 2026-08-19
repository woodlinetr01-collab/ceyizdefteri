import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { SectionTitle, StatusPill, SegmentedControl, EmptyState } from "../components/ui/Primitives.jsx";
import { fmtTL, monthLabel, monthKey, shiftMonthKey, todayIso } from "../lib/formatUtils.js";
import { catColor, CATEGORY_MAP } from "../lib/constants.js";

export default function CalendarPage() {
  const { calc } = useAppData();
  const [view, setView] = useState("liste");
  const [rangeDays, setRangeDays] = useState(30);
  const [calMonth, setCalMonth] = useState(monthKey(todayIso()));

  const events = useMemo(() => {
    const list = calc.lines.map((l) => ({ date: l.dueDate, desc: l.tx.desc, amount: l.remaining, category: l.tx.category, status: l.status, kind: "gider" }));
    calc.debtsEnriched.forEach((d) => {
      if (d.status !== "Tamamlandı") list.push({ date: d.dueDate, desc: `${d.direction === "borc" ? "Ödeyeceğim" : "Alacağım"}: ${d.person}`, amount: d.remaining, category: null, status: d.status === "Kısmen Ödendi" ? "kismi" : "bekliyor", kind: "borc" });
    });
    return list;
  }, [calc]);

  const grouped = useMemo(() => {
    const map = {};
    events.forEach((e) => { const mk = monthKey(e.date); (map[mk] = map[mk] || []).push(e); });
    return Object.entries(map).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [events]);

  const filteredList = useMemo(() => {
    const today = todayIso();
    return events.filter((e) => {
      const d = Math.round((new Date(e.date) - new Date(today)) / 86400000);
      return d >= 0 && d <= rangeDays;
    }).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [events, rangeDays]);

  const calendarDays = useMemo(() => {
    const [y, m] = calMonth.split("-").map(Number);
    const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(y, m, 0).getDate();
    const byDay = {};
    events.filter((e) => monthKey(e.date) === calMonth).forEach((e) => { const d = Number(e.date.slice(8, 10)); (byDay[d] = byDay[d] || []).push(e); });
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push({ d, items: byDay[d] || [] });
    return cells;
  }, [calMonth, events]);

  return (
    <div className="page">
      <SectionTitle kicker="Ödeme Planı" title="Finansal Takvim" action={<SegmentedControl small value={view} onChange={setView} options={[{ value: "liste", label: "Liste" }, { value: "aylik", label: "Aylık" }, { value: "takvim", label: "Takvim" }]} />} />

      {view === "liste" && (
        <>
          <SegmentedControl small value={rangeDays} onChange={setRangeDays} options={[{ value: 7, label: "7 Gün" }, { value: 30, label: "30 Gün" }, { value: 90, label: "90 Gün" }]} />
          <div className="panel">
            <div className="ledger">
              {filteredList.length === 0 ? <EmptyState text="Bu aralıkta etkinlik yok." /> : filteredList.map((e, idx) => (
                <div className="ledger-row" key={idx}>
                  <div className="ledger-date"><span className="ledger-day">{e.date.slice(8, 10)}</span><span className="ledger-month">{e.date.slice(5, 7)}/{e.date.slice(2, 4)}</span></div>
                  <div className="ledger-dot" style={{ background: e.category ? catColor(e.category) : "var(--gold)" }} />
                  <div className="ledger-mid"><div className="ledger-desc">{e.desc}</div><div className="ledger-cat">{e.category ? CATEGORY_MAP[e.category]?.label : "Borç/Alacak"}</div></div>
                  <div className="mono ledger-amount">{fmtTL(e.amount)}</div>
                  <StatusPill status={e.status} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {view === "aylik" && (
        <div className="stack">
          {grouped.map(([mk, list]) => (
            <div className="panel" key={mk}>
              <div className="month-head"><h3>{monthLabel(mk)}</h3><span className="mono month-total">{fmtTL(list.reduce((s, e) => s + e.amount, 0))}</span></div>
              <div className="ledger">
                {list.sort((a, b) => (a.date < b.date ? -1 : 1)).map((e, idx) => (
                  <div className="ledger-row" key={idx}>
                    <div className="ledger-date"><span className="ledger-day">{e.date.slice(8, 10)}</span></div>
                    <div className="ledger-dot" style={{ background: e.category ? catColor(e.category) : "var(--gold)" }} />
                    <div className="ledger-mid"><div className="ledger-desc">{e.desc}</div><div className="ledger-cat">{e.category ? CATEGORY_MAP[e.category]?.label : "Borç/Alacak"}</div></div>
                    <div className="mono ledger-amount">{fmtTL(e.amount)}</div>
                    <StatusPill status={e.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "takvim" && (
        <div className="panel">
          <div className="cal-nav">
            <button className="icon-btn" onClick={() => setCalMonth(shiftMonthKey(calMonth, -1))}><ChevronLeft size={16} /></button>
            <h3>{monthLabel(calMonth)}</h3>
            <button className="icon-btn" onClick={() => setCalMonth(shiftMonthKey(calMonth, 1))}><ChevronRight size={16} /></button>
          </div>
          <div className="cal-grid cal-head-row">{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => <div key={d} className="cal-dow">{d}</div>)}</div>
          <div className="cal-grid">
            {calendarDays.map((c, idx) => (
              <div key={idx} className={`cal-cell ${c ? "" : "cal-empty"}`}>
                {c && (
                  <>
                    <span className="cal-day">{c.d}</span>
                    {c.items.slice(0, 3).map((e, k) => <span key={k} className="cal-dot" style={{ background: e.category ? catColor(e.category) : "var(--gold)" }} title={`${e.desc} · ${fmtTL(e.amount)}`} />)}
                    {c.items.length > 0 && <span className="cal-sum mono">{fmtTL(c.items.reduce((s, e) => s + e.amount, 0))}</span>}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { usePremium } from "../hooks/usePremium.js";
import { SectionTitle } from "../components/ui/Primitives.jsx";
import { answerQuestion, buildMonthlySummary } from "../services/aiAssistant.js";
import { fmtTL } from "../lib/formatUtils.js";

const SUGGESTIONS = [
  "Bu ay ne kadar harcadım?",
  "En fazla hangi kategoriye harcıyorum?",
  "Önümüzdeki 3 ay ödeme yüküm ne?",
  "Ne kadar param var?",
  "Düğün bütçemin yüzde kaçı ödendi?",
];

export default function AssistantPage() {
  const { calc } = useAppData();
  const { isPremium, guard } = usePremium();
  const [messages, setMessages] = useState([{ role: "assistant", text: "Merhaba! Gerçek finansal verilerinize dayanan sorularınızı yanıtlayabilirim. Örneğin: \"Bu ay ne kadar harcadım?\"" }]);
  const [input, setInput] = useState("");

  const summary = buildMonthlySummary(calc);

  const ask = (q) => {
    if (!q.trim()) return;
    if (!guard("aiAssistant").allowed) return;
    setMessages((m) => [...m, { role: "user", text: q }, { role: "assistant", text: answerQuestion(q, calc) }]);
    setInput("");
  };

  return (
    <div className="page">
      <SectionTitle kicker="Premium" title="Finans Asistanım" />

      <div className="panel assistant-summary">
        <div className="eyebrow">Bu Ayki Durumun — {summary.monthLabel}</div>
        <div className="assistant-summary-grid">
          <div><span className="muted">Gelir</span><div className="mono">{fmtTL(summary.income)}</div></div>
          <div><span className="muted">Gider</span><div className="mono">{fmtTL(summary.expense)}</div></div>
          <div><span className="muted">Net</span><div className="mono">{fmtTL(summary.net)}</div></div>
        </div>
        <p className="muted">
          Geçen aya göre {summary.pctChangeVsPrevMonth >= 0 ? `%${summary.pctChangeVsPrevMonth} daha fazla` : `%${Math.abs(summary.pctChangeVsPrevMonth)} daha az`} harcama.
          {summary.topCategory ? ` En fazla harcama: ${summary.topCategory}.` : ""}
          {summary.nextMonthRisk ? ` ⚠ ${summary.nextMonthRisk}` : ""}
        </p>
      </div>

      <div className="panel assistant-chat">
        <div className="assistant-messages">
          {messages.map((m, idx) => (
            <div key={idx} className={`assistant-bubble ${m.role}`}>
              {m.role === "assistant" && <Sparkles size={13} className="assistant-icon" />}
              <span>{m.text}</span>
            </div>
          ))}
        </div>
        <div className="assistant-suggestions">
          {SUGGESTIONS.map((s) => <button key={s} className="tag-btn" onClick={() => ask(s)}>{s}</button>)}
        </div>
        <div className="assistant-input">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(input)} placeholder={isPremium ? "Bir soru yazın…" : "Premium ile soru sorabilirsiniz…"} />
          <button className="icon-btn" onClick={() => ask(input)}><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AI FİNANS ASİSTANI (Premium — madde 37-38)
//
// DURUM: Bu, gerçek bir büyük dil modeline (GPT/Claude vb.) bağlı DEĞİLDİR —
// böyle bir entegrasyon, gizli tutulması gereken bir API anahtarı ve bunu
// güvenle saklayacak bir backend/Edge Function gerektirir (frontend'e asla
// API anahtarı konulmamalı). Bunun yerine burada kural tabanlı (rule-based)
// bir doğal dil eşleştirici bulunur: kullanıcının sorusundaki anahtar
// kelimelere göre soruyu sınıflandırır ve cevabı HER ZAMAN
// services/financeEngine.js'in ürettiği GERÇEK hesaplardan üretir. Hiçbir
// sayı uydurulmaz.
//
// Gerçek bir LLM'e geçmek isterseniz: answerQuestion() fonksiyonunun içini,
// aynı `calc` özetini bir sistem promptu olarak bir Edge Function'a
// gönderecek şekilde değiştirin (bkz. dosya sonundaki örnek). Arayüz
// (AssistantPage) hiç değişmeden çalışmaya devam eder.
// ============================================================================

import { fmtTL, monthLabel, shiftMonthKey } from "../lib/formatUtils.js";

/** VITE_AI_ASSISTANT_MODE=remote + VITE_AI_API_BASE_URL ayarlanmışsa
 * arayüz bunu bilgi amaçlı gösterebilir; ancak bu sürümde fiili çağrı hep
 * kural tabanlı answerQuestion() üzerinden yapılır (bkz. dosya başı notu). */
export const isRemoteAiConfigured = () => import.meta.env.VITE_AI_ASSISTANT_MODE === "remote" && !!import.meta.env.VITE_AI_API_BASE_URL;

function topCategory(calc) {
  const sorted = [...calc.categoryBreakdown].sort((a, b) => b.value - a.value);
  return sorted[0] || null;
}

export function answerQuestion(question, calc) {
  const q = question.toLowerCase();

  if (/(neden|niye).*(param|bakiye|para).*(yetme|yetmedi|bitti)/.test(q) || /param neden yetmedi/.test(q)) {
    const parts = [`Bu ay geliriniz ${fmtTL(calc.thisMonthIncome)}, toplam gideriniz (kart taksitleri ve kredi ödemeleri dahil) ${fmtTL(calc.thisMonthExpense)}.`];
    if (calc.carryOverBalance < 0) parts.push(`Geçen aydan ${fmtTL(Math.abs(calc.carryOverBalance))} açık devrettiği için kullanılabilir bakiyeniz ${fmtTL(calc.availableBalance)} oldu.`);
    else if (calc.carryOverBalance > 0) parts.push(`Geçen aydan ${fmtTL(calc.carryOverBalance)} devreden bakiyenizle birlikte kullanılabilir bakiyeniz ${fmtTL(calc.availableBalance)}.`);
    const top = topCategory(calc);
    if (top) parts.push(`En büyük harcama kaleminiz ${top.label} (${fmtTL(top.value)}).`);
    if (calc.loanThisMonthTotal > 0) parts.push(`Bu ay ${fmtTL(calc.loanThisMonthTotal)} kredi taksidi ödemeniz de bakiyenizi etkiledi.`);
    return parts.join(" ");
  }

  if (/(bu ay).*(harca|gider)/.test(q)) {
    return `Bu ay toplam ${fmtTL(calc.thisMonthExpense)} harcama yaptınız (ödenen + bekleyen dahil). Bu ayki geliriniz ${fmtTL(calc.thisMonthIncome)}.`;
  }
  if (/en (fazla|çok).*(kategori|harca)/.test(q)) {
    const top = topCategory(calc);
    return top ? `En fazla harcama yaptığınız kategori: ${top.label} — toplam ${fmtTL(top.value)}.` : "Henüz kategori bazlı bir harcamanız yok.";
  }
  if (/(önümüzdeki|gelecek)\s*3\s*ay.*(ödeme|yük)/.test(q) || /3 ay.*ödeme yük/.test(q)) {
    const next3 = calc.futureLoad.slice(0, 3);
    const total = next3.reduce((s, m) => s + m.Tutar, 0);
    return `Önümüzdeki 3 ay toplam ödeme yükünüz ${fmtTL(total)}: ` + next3.map((m) => `${m.label} → ${fmtTL(m.Tutar)}`).join(", ") + ".";
  }
  {
    const m = q.match(/(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)/);
    if (m && /açık/.test(q)) {
      const monthIdx = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"].indexOf(m[1]);
      const target = calc.futureLoad.find((f) => Number(f.key.split("-")[1]) - 1 === monthIdx) || calc.monthlyFlow.find((f) => Number(f.key.split("-")[1]) - 1 === monthIdx);
      if (target) {
        const gider = target.Tutar ?? target.Gider;
        const gelir = target.GelirBeklenen ?? target.Gelir;
        const net = gelir - gider;
        return net < 0
          ? `${monthLabel(target.key)} ayında ${fmtTL(Math.abs(net))} açık vermeniz bekleniyor (Gelir: ${fmtTL(gelir)}, Ödeme: ${fmtTL(gider)}).`
          : `${monthLabel(target.key)} ayında açık vermeniz beklenmiyor — beklenen net durum ${fmtTL(net)} (Gelir: ${fmtTL(gelir)}, Ödeme: ${fmtTL(gider)}).`;
      }
    }
  }
  {
    const m = q.match(/(\d[\d.,]*)\s*(tl|₺)?.*alışveriş|alışveriş.*(\d[\d.,]*)\s*(tl|₺)?/);
    if (m && /(alabilir|yapabilir)/.test(q)) {
      const raw = (m[1] || m[3] || "").replace(/\./g, "").replace(",", ".");
      const amount = parseFloat(raw);
      if (!Number.isNaN(amount)) {
        const room = calc.availableBalance - amount;
        return room >= 0
          ? `Evet — mevcut kullanılabilir bakiyeniz ${fmtTL(calc.availableBalance)}. ${fmtTL(amount)} sonrası elinizde ${fmtTL(room)} kalır.`
          : `Şu an için önerilmez — kullanılabilir bakiyeniz ${fmtTL(calc.availableBalance)}, bu alışveriş ${fmtTL(Math.abs(room))} açığa neden olur.`;
      }
    }
  }
  if (/(ne kadar).*(param|bakiye|param var)/.test(q) || /param ne kadar/.test(q)) {
    return `Kullanılabilir bakiyeniz ${fmtTL(calc.availableBalance)}. Toplam borcunuz ${fmtTL(calc.totalDebtOverall)}, toplam alacağınız ${fmtTL(calc.receivable)}.`;
  }
  if (/kredi kart.*borç|borç.*kredi kart/.test(q)) {
    return `Kredi kartlarınızın toplam borcu ${fmtTL(calc.creditCardDebtTotal)}.`;
  }
  if (/(12 ay|yıl).*(ödeme|yük)/.test(q)) {
    return `Önümüzdeki 12 ay toplam ödeme yükümlülüğünüz ${fmtTL(calc.next12MonthsTotal)}.`;
  }
  if (/düğün.*(tamamlan|yüzde|%)/.test(q)) {
    const wedding = calc.budgetProgress.filter((b) => b.group === "dugun");
    const planned = wedding.reduce((s, b) => s + b.planned, 0);
    const paid = wedding.reduce((s, b) => s + b.paid, 0);
    const pct = planned > 0 ? Math.round((paid / planned) * 100) : 0;
    return `Düğün bütçenizin %${pct}'i ödendi (${fmtTL(paid)} / ${fmtTL(planned)}).`;
  }

  return `Şunu sorabilirsiniz: "Bu ay ne kadar harcadım?", "Eylül ayında açık verir miyim?", "En fazla hangi kategoriye harcıyorum?", "Önümüzdeki 3 ay ödeme yüküm ne?", "30.000 TL'lik alışveriş yapabilir miyim?". Sorunuzu bu kalıplara yakın sorarsanız gerçek verilerinize dayanan bir cevap üretebilirim.`;
}

/** Aylık otomatik özet (madde 38) — tamamen gerçek verilerden. */
export function buildMonthlySummary(calc) {
  const thisIdx = calc.monthlyFlow.findIndex((m) => m.key === calc.thisMonthKeyStr);
  const prev = calc.monthlyFlow[thisIdx - 1];
  const curr = calc.monthlyFlow[thisIdx];
  const pctChange = prev && prev.Gider > 0 ? Math.round(((curr.Gider - prev.Gider) / prev.Gider) * 100) : 0;
  const top = topCategory(calc);
  const nextMonthLoad = calc.futureLoad[1];
  return {
    monthLabel: monthLabel(calc.thisMonthKeyStr),
    income: curr.Gelir,
    expense: curr.Gider,
    net: curr.Net,
    pctChangeVsPrevMonth: pctChange,
    topCategory: top?.label || null,
    nextMonthRisk: nextMonthLoad && nextMonthLoad.Tutar > nextMonthLoad.GelirBeklenen
      ? `Gelecek ay (${nextMonthLoad.label}) ödeme yükünüz beklenen gelirinizi aşıyor.`
      : null,
  };
}

/* ----------------------------------------------------------------------
 * Gerçek bir LLM'e bağlanmak için örnek (KULLANILMIYOR — referans amaçlı):
 *
 * export async function answerQuestionWithLLM(question, calc) {
 *   const res = await fetch("/api/ai-assistant", { // kendi Edge Function'ınız
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ question, financialSnapshot: calc }),
 *   });
 *   const { answer } = await res.json();
 *   return answer;
 * }
 * ------------------------------------------------------------------- */

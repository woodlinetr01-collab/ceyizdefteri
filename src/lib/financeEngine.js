// ============================================================================
// FINANCE ENGINE — Tüm finansal mantığın tek merkezi.
// Bu dosya React'ten bağımsızdır (saf fonksiyonlar). UI hiçbir hesaplamayı
// kendi başına yapmaz; her zaman buradaki fonksiyonları çağırır.
//
// KRİTİK KURAL (bkz. proje talimatı madde 72):
//   - Bir gider işleminin toplam tutarı, taksit sayısı kadar çoğaltılmaz.
//   - Ödenmiş bir taksit/kalem tekrar borç olarak sayılmaz.
//   - Transferler gelir/gider toplamlarını etkilemez.
//   - Peşinat + taksitler toplamı her zaman totalAmount'a eşittir.
// ============================================================================

import { uid, nowIso, monthKey, monthLabelShort, addMonthsToDate, addDaysToDate, addYearsToDate, daysBetween, shiftMonthKey, todayIso } from "./formatUtils.js";
import { catColor, CATEGORIES, INSTALLMENT_STATUS } from "./constants.js";

/* ----------------------------------------------------------------------
   Payments / satır durumu
---------------------------------------------------------------------- */
export const sumPayments = (payments) => (payments || []).reduce((s, p) => s + (p.amount || 0), 0);

/** Bir taksit/ödeme satırının anlık durumunu, kayıtlı payments[] verisinden TÜRETİR.
 * Böylece "ödendi -> geri al" gibi işlemlerde tutarsızlık oluşmaz (madde 11). */
export function lineStatus(line, today = todayIso()) {
  if (line.cancelled) return INSTALLMENT_STATUS.CANCELLED;
  const paid = sumPayments(line.payments);
  if (paid >= line.amount && line.amount > 0) return INSTALLMENT_STATUS.PAID;
  if (paid > 0) return "kismi"; // kısmi ödeme (yalnızca tekli/basit giderlerde anlamlı gösterilir)
  if (line.dueDate < today) return INSTALLMENT_STATUS.LATE;
  return INSTALLMENT_STATUS.WAITING;
}
export const lineRemaining = (line) => Math.max(0, line.amount - sumPayments(line.payments));
export const lineIsPaid = (line) => !line.cancelled && sumPayments(line.payments) >= line.amount && line.amount > 0;

/* ----------------------------------------------------------------------
   Taksit üretimi
---------------------------------------------------------------------- */
export function generateInstallmentLines({ transactionId, totalAmount, downPayment = 0, isInstallment, cardId, installmentCount = 1, firstInstallmentDate, installmentPeriod = "aylik", txDate }) {
  const ts = nowIso();
  if (!isInstallment) {
    return [{
      id: uid("ins"), transactionId, no: 1, of: 1, dueDate: txDate, amount: totalAmount,
      payments: [], cancelled: false, cardId: cardId || null, createdAt: ts, updatedAt: ts,
    }];
  }
  const lines = [];
  if (downPayment > 0) {
    lines.push({
      id: uid("ins"), transactionId, no: 0, of: installmentCount, dueDate: txDate, amount: downPayment,
      payments: [{ id: uid("pay"), amount: downPayment, date: txDate, method: "Peşinat" }],
      cancelled: false, cardId: cardId || null, createdAt: ts, updatedAt: ts,
    });
  }
  const remaining = Math.max(0, totalAmount - downPayment);
  const base = Math.floor(remaining / installmentCount);
  for (let i = 0; i < installmentCount; i++) {
    const dueDate =
      installmentPeriod === "haftalik" ? addDaysToDate(firstInstallmentDate, 7 * i)
      : installmentPeriod === "3aylik" ? addMonthsToDate(firstInstallmentDate, 3 * i)
      : addMonthsToDate(firstInstallmentDate, i);
    const amount = i === installmentCount - 1 ? remaining - base * (installmentCount - 1) : base;
    lines.push({
      id: uid("ins"), transactionId, no: i + 1, of: installmentCount, dueDate, amount,
      payments: [], cancelled: false, cardId: cardId || null, createdAt: ts, updatedAt: ts,
    });
  }
  return lines;
}

/** Belirli bir taksitten sonraki tüm bekleyen taksitleri kaydırır (madde 13). */
export function shiftFutureInstallments(installments, fromNo, deltaFn) {
  return installments.map((l) => (l.no >= fromNo && !lineIsPaid(l) ? { ...l, dueDate: deltaFn(l.dueDate), updatedAt: nowIso() } : l));
}

/* ----------------------------------------------------------------------
   Düzenli (recurring) işlemlerden gelecek somut kayıt üretimi
---------------------------------------------------------------------- */
export function nextOccurrence(dateStr, frequency, intervalDays) {
  if (frequency === "weekly") return addDaysToDate(dateStr, 7);
  if (frequency === "yearly") return addYearsToDate(dateStr, 1);
  if (frequency === "custom") return addDaysToDate(dateStr, intervalDays || 30);
  return addMonthsToDate(dateStr, 1); // monthly
}

/** Bir recurring kural için, bugünden itibaren `monthsAhead` ay ileriye kadar
 * henüz üretilmemiş somut transaction'ları döndürür (idempotent). */
export function generateRecurringOccurrences(rule, existingTransactions, monthsAhead = 3) {
  const horizon = addMonthsToDate(todayIso(), monthsAhead);
  const existingDates = new Set(
    existingTransactions.filter((t) => t.recurringId === rule.id).map((t) => t.date)
  );
  const out = [];
  let cursor = rule.lastGeneratedDate || rule.startDate;
  if (existingDates.size > 0) cursor = nextOccurrence(cursor, rule.frequency, rule.intervalDays);
  let guard = 0;
  while (cursor <= horizon && guard < 500) {
    guard++;
    if (rule.endDate && cursor > rule.endDate) break;
    if (!existingDates.has(cursor)) {
      out.push({
        id: uid("tx"), type: rule.kind, origin: "recurring", recurringId: rule.id,
        group: rule.group || "diger", category: rule.category, desc: rule.desc, totalAmount: rule.amount,
        date: cursor, paymentMethod: rule.paymentMethod || "Banka Havalesi", cardId: rule.cardId || null,
        isInstallment: false, incomeStatus: "Alınmadı", whoAdded: "me", note: "", deletedAt: null,
        createdAt: nowIso(), updatedAt: nowIso(),
      });
      existingDates.add(cursor);
    }
    cursor = nextOccurrence(cursor, rule.frequency, rule.intervalDays);
  }
  return out;
}

/* ----------------------------------------------------------------------
   ANA HESAPLAMA MOTORU
---------------------------------------------------------------------- */
export function computeSummary(state, today = todayIso()) {
  const liveTx = state.transactions.filter((t) => !t.deletedAt);
  const expenseTx = liveTx.filter((t) => t.type === "expense");
  const incomeTx = liveTx.filter((t) => t.type === "income");
  const transferTx = liveTx.filter((t) => t.type === "transfer");

  const lines = state.installments
    .filter((l) => !l.deletedAt)
    .map((l) => {
      const tx = expenseTx.find((t) => t.id === l.transactionId);
      if (!tx) return null;
      return { ...l, tx, status: lineStatus(l, today), paid: sumPayments(l.payments), remaining: lineRemaining(l) };
    })
    .filter(Boolean);

  const totalExpense = expenseTx.reduce((s, t) => s + t.totalAmount, 0);
  const totalPaid = lines.reduce((s, l) => s + l.paid, 0);
  const totalUnpaid = Math.max(0, totalExpense - totalPaid);

  const totalIncomeExpected = incomeTx.reduce((s, t) => s + t.totalAmount, 0);
  const totalIncomeReceived = incomeTx.filter((t) => t.incomeStatus === "Alındı").reduce((s, t) => s + t.totalAmount, 0);
  const totalIncomePending = totalIncomeExpected - totalIncomeReceived;

  const liveDebts = state.debts.filter((d) => !d.deletedAt);
  const debtsEnriched = liveDebts.map((d) => {
    const paid = sumPayments(d.payments);
    const remaining = Math.max(0, d.amount - paid);
    const status = paid <= 0 ? "Bekliyor" : paid < d.amount ? "Kısmen Ödendi" : "Tamamlandı";
    return { ...d, paid, remaining, status };
  });
  const debtToOthers = debtsEnriched.filter((d) => d.direction === "borc" && d.status !== "Tamamlandı").reduce((s, d) => s + d.remaining, 0);
  const receivable = debtsEnriched.filter((d) => d.direction === "alacak" && d.status !== "Tamamlandı").reduce((s, d) => s + d.remaining, 0);

  const liveCards = state.cards.filter((c) => !c.deletedAt);
  const cardsComputed = liveCards.map((c) => {
    const cardLines = lines.filter((l) => l.tx.paymentMethod === "Kredi Kartı" && l.tx.cardId === c.id);
    const unpaid = cardLines.reduce((s, l) => s + l.remaining, 0);
    const totalDebt = unpaid + (c.existingDebt || 0);
    const thisMonth = cardLines.filter((l) => l.status !== "odendi" && monthKey(l.dueDate) === monthKey(today)).reduce((s, l) => s + l.remaining, 0);
    const nextMonth = cardLines.filter((l) => l.status !== "odendi" && monthKey(l.dueDate) === shiftMonthKey(monthKey(today), 1)).reduce((s, l) => s + l.remaining, 0);
    const monthAfter = cardLines.filter((l) => l.status !== "odendi" && monthKey(l.dueDate) === shiftMonthKey(monthKey(today), 2)).reduce((s, l) => s + l.remaining, 0);
    const laterMonths = Math.max(0, totalDebt - thisMonth - nextMonth - monthAfter);
    const usedLimit = totalDebt;
    const availableLimit = Math.max(0, c.limit - usedLimit);
    const usagePct = c.limit > 0 ? Math.round((usedLimit / c.limit) * 100) : 0;
    const linkedTxCount = new Set(cardLines.map((l) => l.tx.id)).size;
    return { ...c, cardLines, linkedTxCount, totalDebt, thisMonth, nextMonth, monthAfter, laterMonths, usedLimit, availableLimit, usagePct, minPayment: Math.round(thisMonth * 0.2) };
  });
  const creditCardDebtTotal = cardsComputed.reduce((s, c) => s + c.totalDebt, 0);

  const totalDebtOverall = totalUnpaid + debtToOthers;
  const availableBalance = totalIncomeReceived - totalPaid - debtsEnriched.filter((d) => d.direction === "borc").reduce((s, d) => s + d.paid, 0) + debtsEnriched.filter((d) => d.direction === "alacak").reduce((s, d) => s + d.paid, 0);
  const netWorth = availableBalance - totalDebtOverall + receivable;

  const thisMonthKeyStr = monthKey(today);
  const thisMonthExpense = lines.filter((l) => monthKey(l.dueDate) === thisMonthKeyStr).reduce((s, l) => s + l.amount, 0);
  const thisMonthInstallmentDue = lines.filter((l) => l.status !== "odendi" && monthKey(l.dueDate) === thisMonthKeyStr).reduce((s, l) => s + l.remaining, 0);
  const thisMonthIncome = incomeTx.filter((t) => monthKey(t.date) === thisMonthKeyStr).reduce((s, t) => s + t.totalAmount, 0);

  const upcoming = (days) =>
    lines
      .filter((l) => l.status !== "odendi" && l.status !== "iptal" && daysBetween(today, l.dueDate) >= 0 && daysBetween(today, l.dueDate) <= days)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  const overdue = lines.filter((l) => l.status === "gecikti");

  const flowMonths = [];
  for (let k = -6; k <= 5; k++) flowMonths.push(shiftMonthKey(thisMonthKeyStr, k));
  const monthlyFlow = flowMonths.map((mk) => {
    const income = incomeTx.filter((t) => monthKey(t.date) === mk).reduce((s, t) => s + t.totalAmount, 0);
    const expense = lines.filter((l) => monthKey(l.dueDate) === mk).reduce((s, l) => s + l.amount, 0);
    return { key: mk, label: monthLabelShort(mk), Gelir: income, Gider: expense, Net: income - expense };
  });

  const futureMonths = [];
  for (let k = 0; k <= 11; k++) futureMonths.push(shiftMonthKey(thisMonthKeyStr, k));
  const futureLoad = futureMonths.map((mk) => {
    const total = lines.filter((l) => l.status !== "odendi" && l.status !== "iptal" && monthKey(l.dueDate) === mk).reduce((s, l) => s + l.remaining, 0);
    const incomeExpected = incomeTx.filter((t) => monthKey(t.date) === mk).reduce((s, t) => s + t.totalAmount, 0);
    return { key: mk, label: monthLabelShort(mk), Tutar: total, GelirBeklenen: incomeExpected, Beklenen: incomeExpected - total };
  });
  const next12MonthsTotal = futureLoad.reduce((s, m) => s + m.Tutar, 0);

  const categoryBreakdown = CATEGORIES.map((c) => ({
    key: c.key, label: c.label, group: c.group,
    value: lines.filter((l) => l.tx.category === c.key).reduce((s, l) => s + l.amount, 0),
    color: catColor(c.key),
  })).filter((c) => c.value > 0);

  const budgetProgress = CATEGORIES.map((c) => {
    const planned = state.categoryBudgets[c.key] || 0;
    const actual = lines.filter((l) => l.tx.category === c.key).reduce((s, l) => s + l.amount, 0);
    const paid = lines.filter((l) => l.tx.category === c.key).reduce((s, l) => s + l.paid, 0);
    return { key: c.key, label: c.label, group: c.group, planned, actual, paid, over: actual - planned, remaining: Math.max(0, planned - actual) };
  }).filter((c) => c.planned > 0 || c.actual > 0);

  const alerts = buildAlerts({ upcoming, cardsComputed, budgetProgress, next30: lines.filter((l) => l.status !== "odendi" && daysBetween(today, l.dueDate) >= 0 && daysBetween(today, l.dueDate) <= 30).reduce((s, l) => s + l.remaining, 0), thisMonthInstallmentDue, thisMonthIncome });

  return {
    today, lines, expenseTx, incomeTx, transferTx, debtsEnriched,
    totalExpense, totalPaid, totalUnpaid, totalIncomeExpected, totalIncomeReceived, totalIncomePending,
    debtToOthers, receivable, cardsComputed, creditCardDebtTotal, totalDebtOverall, availableBalance, netWorth,
    thisMonthExpense, thisMonthInstallmentDue, thisMonthIncome, upcoming, overdue, monthlyFlow, futureLoad, next12MonthsTotal,
    categoryBreakdown, budgetProgress, alerts, thisMonthKeyStr,
  };
}

function buildAlerts({ upcoming, cardsComputed, budgetProgress, next30, thisMonthInstallmentDue, thisMonthIncome }) {
  const alerts = [];
  upcoming(7).forEach((l) => {
    const d = daysBetween(todayIso(), l.dueDate);
    alerts.push({ level: d <= 3 ? "red" : "amber", type: "payment", text: `${d} gün sonra ${l.tx.desc} için ${Math.round(l.remaining).toLocaleString("tr-TR")} ₺ ödeme var.` });
  });
  cardsComputed.forEach((c) => {
    if (c.limit > 0 && c.usagePct >= 90) alerts.push({ level: "red", type: "card", text: `${c.name} kartınızın kullanım oranı %${c.usagePct} — kritik seviyede.` });
    else if (c.limit > 0 && c.usagePct >= 80) alerts.push({ level: "amber", type: "card", text: `${c.name} kartınızın kullanım oranı %${c.usagePct}.` });
  });
  budgetProgress.forEach((b) => {
    if (b.over > 0) alerts.push({ level: "red", type: "budget", text: `${b.label} bütçenizi ${Math.round(b.over).toLocaleString("tr-TR")} ₺ aştınız.` });
  });
  if (next30 > 0) alerts.push({ level: "amber", type: "payment", text: `Önümüzdeki 30 gün içinde toplam ${Math.round(next30).toLocaleString("tr-TR")} ₺ ödeme yapmanız gerekiyor.` });
  if (thisMonthInstallmentDue > thisMonthIncome) {
    alerts.push({ level: "red", type: "cashflow", text: `Bu ay ödeme yükümlülüğünüz gelirinizden fazla — açık veriyorsunuz.` });
  }
  return alerts;
}

/* ----------------------------------------------------------------------
   Mükerrer kayıt tespiti (madde 36)
---------------------------------------------------------------------- */
export function findPossibleDuplicate(transactions, candidate) {
  return transactions.find(
    (t) =>
      !t.deletedAt &&
      t.type === candidate.type &&
      t.date === candidate.date &&
      Math.abs(t.totalAmount - candidate.totalAmount) < 0.5 &&
      t.desc.trim().toLowerCase() === candidate.desc.trim().toLowerCase() &&
      (t.cardId || null) === (candidate.cardId || null)
  );
}

/* ----------------------------------------------------------------------
   Otomatik kategori önerisi (madde 35)
---------------------------------------------------------------------- */
const CATEGORY_KEYWORDS = [
  { rx: /ikea|mobilya|koltuk|yatak\s*odas/i, category: "mobilya" },
  { rx: /mediamarkt|teknosa|vatan|elektronik|tv|televizyon|laptop/i, category: "elektronik" },
  { rx: /migros|carrefour|a101|bim|şok|market/i, category: "yemek" },
  { rx: /fotoğraf|foto[gğ]rafç[iı]|video/i, category: "fotografci" },
  { rx: /salon|düğün\s*salon/i, category: "salon" },
  { rx: /gelinlik/i, category: "gelinlik" },
  { rx: /damatl[ıi]k/i, category: "damatlik" },
  { rx: /kuaför|makyaj/i, category: "kuafor" },
  { rx: /davetiye/i, category: "davetiye" },
  { rx: /çiçek/i, category: "cicek" },
  { rx: /balayı|otel|hotel/i, category: "balayi" },
  { rx: /kira/i, category: "kira" },
  { rx: /fatura|elektrik|su|doğalgaz|internet/i, category: "fatura" },
  { rx: /beyaz\s*eşya|buzdolabı|çamaşır|bulaşık|fırın/i, category: "beyaz_esya" },
  { rx: /taksi|uber|benzin|akaryak[ıi]t|otobüs/i, category: "ulasim" },
];
export function suggestCategory(desc) {
  const hit = CATEGORY_KEYWORDS.find((k) => k.rx.test(desc || ""));
  return hit ? hit.category : null;
}

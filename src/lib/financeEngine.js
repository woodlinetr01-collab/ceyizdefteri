// ============================================================================
// FINANCE ENGINE — Tüm finansal mantığın tek merkezi.
// Bu dosya React'ten bağımsızdır (saf fonksiyonlar). UI hiçbir hesaplamayı
// kendi başına yapmaz; her zaman buradaki fonksiyonları çağırır.
//
// KRİTİK KURALLAR:
//   - Bir gider işleminin toplam tutarı, taksit sayısı kadar çoğaltılmaz.
//   - Ödenmiş bir taksit/kalem tekrar borç olarak sayılmaz.
//   - Transferler gelir/gider toplamlarını etkilemez.
//   - Peşinat + taksitler toplamı her zaman totalAmount'a eşittir.
//   - Bir kartın "mevcut borcu" kullanıcı tarafından "geçmiş harcamaları
//     içeriyor" olarak işaretlenmişse, o tarihten ÖNCEKİ kart işlemleri
//     borca tekrar eklenmez (bkz. computeCardDebt / madde: çift sayma fix).
//   - Kredi taksidi ödendiğinde AYRI bir gider kaydı OLUŞTURULMAZ — kredi
//     ödemeleri kendi programından (loanInstallments) doğrudan aylık
//     bilançoya dahil edilir, transactions/installments tablosuna asla
//     yazılmaz. Böylece aynı ödeme iki kez sayılamaz.
// ============================================================================

import { uid, nowIso, monthKey, monthLabelShort, addMonthsToDate, addDaysToDate, addYearsToDate, daysBetween, shiftMonthKey, todayIso } from "./formatUtils.js";
import { catColor, CATEGORIES, INSTALLMENT_STATUS } from "./constants.js";

/* ----------------------------------------------------------------------
   Payments / satır durumu (gider taksitleri VE kredi taksitleri ortak kullanır)
---------------------------------------------------------------------- */
export const sumPayments = (payments) => (payments || []).reduce((s, p) => s + (p.amount || 0), 0);

export function lineStatus(line, today = todayIso()) {
  if (line.cancelled) return INSTALLMENT_STATUS.CANCELLED;
  const paid = sumPayments(line.payments);
  if (paid >= line.amount && line.amount > 0) return INSTALLMENT_STATUS.PAID;
  if (paid > 0) return "kismi";
  if (line.dueDate < today) return INSTALLMENT_STATUS.LATE;
  return INSTALLMENT_STATUS.WAITING;
}
export const lineRemaining = (line) => Math.max(0, line.amount - sumPayments(line.payments));
export const lineIsPaid = (line) => !line.cancelled && sumPayments(line.payments) >= line.amount && line.amount > 0;

/* ----------------------------------------------------------------------
   Taksit üretimi (gider işlemleri)
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

export function shiftFutureInstallments(installments, fromNo, deltaFn) {
  return installments.map((l) => (l.no >= fromNo && !lineIsPaid(l) ? { ...l, dueDate: deltaFn(l.dueDate), updatedAt: nowIso() } : l));
}

/* ----------------------------------------------------------------------
   KREDİ (loan) taksit programı üretimi — transactions'tan tamamen ayrı bir
   çizelge. Bir kredi taksidi ödendiğinde burada payments[] güncellenir;
   asla bir "expense" transaction/installment satırı OLUŞTURULMAZ. Böylece
   aynı ödeme iki farklı yerde iki kez gider olarak sayılamaz.
---------------------------------------------------------------------- */
export function generateLoanInstallments({ loanId, installmentCount, monthlyPayment, firstPaymentDate }) {
  const ts = nowIso();
  const lines = [];
  for (let i = 0; i < installmentCount; i++) {
    lines.push({
      id: uid("loanins"), loanId, no: i + 1, of: installmentCount,
      dueDate: addMonthsToDate(firstPaymentDate, i), amount: monthlyPayment,
      payments: [], cancelled: false, createdAt: ts, updatedAt: ts,
    });
  }
  return lines;
}

/* ----------------------------------------------------------------------
   Düzenli (recurring) işlemlerden gelecek somut kayıt üretimi
---------------------------------------------------------------------- */
export function nextOccurrence(dateStr, frequency, intervalDays) {
  if (frequency === "weekly") return addDaysToDate(dateStr, 7);
  if (frequency === "yearly") return addYearsToDate(dateStr, 1);
  if (frequency === "custom") return addDaysToDate(dateStr, intervalDays || 30);
  return addMonthsToDate(dateStr, 1);
}

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
   Aylık defter / devir zinciri (madde: aylık bilanço + devir mantığı)
   Her ay: açılış = önceki ayın kapanışı; kapanış = açılış + gelir - gider.
   Gider burada "vadesi o ayda olan tüm kalemlerin tutarı" (ödenmiş/ödenmemiş
   fark etmeksizin) olarak alınır — kullanıcının verdiği örneklerle birebir
   tutarlı olacak şekilde. state her değiştiğinde TAMAMEN yeniden hesaplanır,
   bu yüzden geçmişe eklenen bir kayıt sonraki tüm ayları otomatik doğru hale
   getirir (staleness riski yoktur).
---------------------------------------------------------------------- */
function computeMonthlyLedger({ lines, incomeTx, loanLines, today }) {
  const allDates = [
    ...lines.map((l) => l.dueDate),
    ...incomeTx.map((t) => t.date),
    ...loanLines.map((l) => l.dueDate),
  ];
  const horizonMonth = shiftMonthKey(monthKey(today), 11);
  if (allDates.length === 0) {
    // Veri yoksa yalnızca bugünden 11 ay ileriye kadar boş bir defter döndür.
    const order = [];
    let cursor = monthKey(today);
    for (let i = 0; i <= 11; i++) { order.push(cursor); cursor = shiftMonthKey(cursor, 1); }
    const byMonth = {};
    order.forEach((mk) => { byMonth[mk] = { key: mk, income: 0, expense: 0, net: 0, opening: 0, closing: 0 }; });
    return { byMonth, order };
  }
  let minMonth = allDates.reduce((a, b) => (a < b ? a : b));
  let maxMonth = allDates.reduce((a, b) => (a > b ? a : b));
  minMonth = monthKey(minMonth);
  maxMonth = monthKey(maxMonth);
  if (maxMonth < horizonMonth) maxMonth = horizonMonth;

  const order = [];
  let cursor = minMonth;
  let guard = 0;
  while (cursor <= maxMonth && guard < 600) {
    order.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
    guard++;
  }

  let running = 0;
  const byMonth = {};
  order.forEach((mk) => {
    const income = incomeTx.filter((t) => monthKey(t.date) === mk).reduce((s, t) => s + t.totalAmount, 0);
    const expenseLines = lines.filter((l) => monthKey(l.dueDate) === mk).reduce((s, l) => s + l.amount, 0);
    const loanExpense = loanLines.filter((l) => monthKey(l.dueDate) === mk).reduce((s, l) => s + l.amount, 0);
    const expense = expenseLines + loanExpense;
    const opening = running;
    const net = income - expense;
    const closing = opening + net;
    byMonth[mk] = { key: mk, income, expense, net, opening, closing, loanExpense, cardCategoryExpense: expenseLines };
    running = closing;
  });
  return { byMonth, order };
}

/* ----------------------------------------------------------------------
   ANA HESAPLAMA MOTORU — TEK DOĞRU VERİ KAYNAĞI
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

  // ---- KREDİ KARTLARI (çift sayma düzeltmesi burada) -----------------
  const liveCards = state.cards.filter((c) => !c.deletedAt);
  const cardsComputed = liveCards.map((c) => {
    const allCardLines = lines.filter((l) => l.tx.paymentMethod === "Kredi Kartı" && l.tx.cardId === c.id);
    // "Mevcut borç geçmiş harcamaları içeriyor" (includesHistory) seçildiyse,
    // baselineDate'ten ÖNCEKİ işlemler zaten existingDebt'in içinde kabul
    // edilir ve borca bir daha eklenmez — bu, talimattaki çift sayma
    // hatasının doğrudan düzeltmesidir.
    const countableLines = c.existingDebtIncludesHistory && c.baselineDate
      ? allCardLines.filter((l) => l.tx.date >= c.baselineDate)
      : allCardLines;
    const unpaid = countableLines.reduce((s, l) => s + l.remaining, 0);
    const totalDebt = unpaid + (c.existingDebt || 0);
    const thisMonth = countableLines.filter((l) => l.status !== "odendi" && monthKey(l.dueDate) === monthKey(today)).reduce((s, l) => s + l.remaining, 0);
    const nextMonth = countableLines.filter((l) => l.status !== "odendi" && monthKey(l.dueDate) === shiftMonthKey(monthKey(today), 1)).reduce((s, l) => s + l.remaining, 0);
    const monthAfter = countableLines.filter((l) => l.status !== "odendi" && monthKey(l.dueDate) === shiftMonthKey(monthKey(today), 2)).reduce((s, l) => s + l.remaining, 0);
    const laterMonths = Math.max(0, totalDebt - thisMonth - nextMonth - monthAfter);
    const usedLimit = totalDebt;
    const availableLimit = Math.max(0, c.limit - usedLimit);
    const usagePct = c.limit > 0 ? Math.round((usedLimit / c.limit) * 100) : 0;
    const linkedTxCount = new Set(allCardLines.map((l) => l.tx.id)).size;
    const excludedHistoryCount = allCardLines.length - countableLines.length;
    return { ...c, cardLines: allCardLines, linkedTxCount, excludedHistoryCount, totalDebt, thisMonth, nextMonth, monthAfter, laterMonths, usedLimit, availableLimit, usagePct, minPayment: Math.round(thisMonth * 0.2) };
  });
  const creditCardDebtTotal = cardsComputed.reduce((s, c) => s + c.totalDebt, 0);

  // ---- KREDİLER (loans) — transactions'tan tamamen izole -------------
  const liveLoans = state.loans.filter((l) => !l.deletedAt);
  const loanLines = (state.loanInstallments || []).filter((l) => !l.deletedAt);
  const loansComputed = liveLoans.map((loan) => {
    const schedule = loanLines.filter((l) => l.loanId === loan.id).sort((a, b) => (a.no < b.no ? -1 : 1));
    const enriched = schedule.map((l) => ({ ...l, status: lineStatus(l, today), paid: sumPayments(l.payments), remaining: lineRemaining(l) }));
    const paidCount = enriched.filter((l) => l.status === "odendi").length;
    const remainingCount = enriched.length - paidCount;
    const remainingDebt = enriched.filter((l) => l.status !== "odendi").reduce((s, l) => s + l.remaining, 0);
    const nextUnpaid = enriched.find((l) => l.status !== "odendi");
    const thisMonth = enriched.filter((l) => l.status !== "odendi" && monthKey(l.dueDate) === monthKey(today)).reduce((s, l) => s + l.remaining, 0);
    const nextMonth = enriched.filter((l) => l.status !== "odendi" && monthKey(l.dueDate) === shiftMonthKey(monthKey(today), 1)).reduce((s, l) => s + l.remaining, 0);
    return { ...loan, schedule: enriched, paidCount, remainingCount, remainingDebt, nextPaymentDate: nextUnpaid?.dueDate || null, thisMonth, nextMonth };
  });
  const loanDebtTotal = loansComputed.reduce((s, l) => s + l.remainingDebt, 0);
  const loanThisMonthTotal = loansComputed.reduce((s, l) => s + l.thisMonth, 0);

  const totalDebtOverall = totalUnpaid + debtToOthers + loanDebtTotal;

  // ---- Aylık defter / devir ------------------------------------------
  const allLoanLinesEnriched = loansComputed.flatMap((l) => l.schedule);
  const ledger = computeMonthlyLedger({ lines, incomeTx, loanLines: allLoanLinesEnriched, today });
  const thisMonthKeyStr = monthKey(today);
  const nextMonthKeyStr = shiftMonthKey(thisMonthKeyStr, 1);
  const thisMonthLedger = ledger.byMonth[thisMonthKeyStr] || { income: 0, expense: 0, net: 0, opening: 0, closing: 0 };
  const nextMonthLedgerRaw = ledger.byMonth[nextMonthKeyStr] || { income: 0, expense: 0, net: 0, opening: 0, closing: 0 };
  const carryOverBalance = thisMonthLedger.opening; // önceki aydan devreden bakiye
  const availableBalance = thisMonthLedger.closing; // devir dahil kullanılabilir bakiye
  const netWorth = availableBalance - totalDebtOverall + receivable;

  const thisMonthExpense = thisMonthLedger.expense;
  const thisMonthIncome = thisMonthLedger.income;
  const thisMonthInstallmentDue = lines.filter((l) => l.status !== "odendi" && monthKey(l.dueDate) === thisMonthKeyStr).reduce((s, l) => s + l.remaining, 0) + loanThisMonthTotal;

  const nextMonthCardInstallments = lines.filter((l) => l.status !== "odendi" && l.tx.paymentMethod === "Kredi Kartı" && monthKey(l.dueDate) === nextMonthKeyStr).reduce((s, l) => s + l.remaining, 0);
  const nextMonthLoanPayment = loansComputed.reduce((s, l) => s + l.nextMonth, 0);
  const nextMonthForecast = {
    key: nextMonthKeyStr,
    income: nextMonthLedgerRaw.income,
    expense: nextMonthLedgerRaw.expense,
    cardInstallments: nextMonthCardInstallments,
    loanPayments: nextMonthLoanPayment,
    otherExpense: Math.max(0, nextMonthLedgerRaw.expense - nextMonthCardInstallments - nextMonthLoanPayment),
    carryIn: thisMonthLedger.closing,
    expectedFree: nextMonthLedgerRaw.income - nextMonthLedgerRaw.expense + thisMonthLedger.closing,
  };

  const upcomingExpenseLines = () => lines;
  const upcoming = (days) => {
    const expenseItems = lines
      .filter((l) => l.status !== "odendi" && l.status !== "iptal" && daysBetween(today, l.dueDate) >= 0 && daysBetween(today, l.dueDate) <= days)
      .map((l) => ({ ...l, kind: "gider" }));
    const loanItems = allLoanLinesEnriched
      .filter((l) => l.status !== "odendi" && l.status !== "iptal" && daysBetween(today, l.dueDate) >= 0 && daysBetween(today, l.dueDate) <= days)
      .map((l) => ({ ...l, kind: "kredi", tx: { desc: `${loansComputed.find((ln) => ln.id === l.loanId)?.name || "Kredi"} Taksidi`, category: null } }));
    return [...expenseItems, ...loanItems].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  };

  const overdue = [...lines.filter((l) => l.status === "gecikti"), ...allLoanLinesEnriched.filter((l) => l.status === "gecikti").map((l) => ({ ...l, kind: "kredi", tx: { desc: `${loansComputed.find((ln) => ln.id === l.loanId)?.name || "Kredi"} Taksidi` } }))];

  const flowMonths = [];
  for (let k = -6; k <= 5; k++) flowMonths.push(shiftMonthKey(thisMonthKeyStr, k));
  const monthlyFlow = flowMonths.map((mk) => {
    const m = ledger.byMonth[mk] || { income: 0, expense: 0, net: 0, opening: 0, closing: 0 };
    return { key: mk, label: monthLabelShort(mk), Gelir: m.income, Gider: m.expense, Net: m.net, Devir: m.opening, Kapanis: m.closing };
  });

  const futureMonths = [];
  for (let k = 0; k <= 11; k++) futureMonths.push(shiftMonthKey(thisMonthKeyStr, k));
  const futureLoad = futureMonths.map((mk) => {
    const cardTotal = lines.filter((l) => l.status !== "odendi" && l.status !== "iptal" && monthKey(l.dueDate) === mk).reduce((s, l) => s + l.remaining, 0);
    const loanTotal = allLoanLinesEnriched.filter((l) => l.status !== "odendi" && l.status !== "iptal" && monthKey(l.dueDate) === mk).reduce((s, l) => s + l.remaining, 0);
    const total = cardTotal + loanTotal;
    const incomeExpected = incomeTx.filter((t) => monthKey(t.date) === mk).reduce((s, t) => s + t.totalAmount, 0);
    return { key: mk, label: monthLabelShort(mk), Tutar: total, GiderKismi: cardTotal, KrediKismi: loanTotal, GelirBeklenen: incomeExpected, Beklenen: incomeExpected - total };
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

  const alerts = buildAlerts({
    upcoming, cardsComputed, loansComputed, budgetProgress,
    next30: lines.filter((l) => l.status !== "odendi" && daysBetween(today, l.dueDate) >= 0 && daysBetween(today, l.dueDate) <= 30).reduce((s, l) => s + l.remaining, 0)
      + allLoanLinesEnriched.filter((l) => l.status !== "odendi" && daysBetween(today, l.dueDate) >= 0 && daysBetween(today, l.dueDate) <= 30).reduce((s, l) => s + l.remaining, 0),
    thisMonthInstallmentDue, thisMonthIncome, carryOverBalance, thisMonthExpense,
  });

  return {
    today, lines, expenseTx, incomeTx, transferTx, debtsEnriched,
    totalExpense, totalPaid, totalUnpaid, totalIncomeExpected, totalIncomeReceived, totalIncomePending,
    debtToOthers, receivable, cardsComputed, creditCardDebtTotal, loansComputed, loanDebtTotal, loanThisMonthTotal,
    totalDebtOverall, availableBalance, netWorth, carryOverBalance, ledger, nextMonthForecast,
    thisMonthExpense, thisMonthInstallmentDue, thisMonthIncome, upcoming, overdue, monthlyFlow, futureLoad, next12MonthsTotal,
    categoryBreakdown, budgetProgress, alerts, thisMonthKeyStr,
  };
}

function buildAlerts({ upcoming, cardsComputed, loansComputed, budgetProgress, next30, thisMonthInstallmentDue, thisMonthIncome, carryOverBalance, thisMonthExpense }) {
  const alerts = [];
  upcoming(7).forEach((l) => {
    const d = daysBetween(todayIso(), l.dueDate);
    alerts.push({ level: d <= 3 ? "red" : "amber", type: l.kind === "kredi" ? "loan" : "payment", text: `${d} gün sonra ${l.tx.desc} için ${Math.round(l.remaining).toLocaleString("tr-TR")} ₺ ödeme var.` });
  });
  cardsComputed.forEach((c) => {
    if (c.limit > 0 && c.usagePct >= 90) alerts.push({ level: "red", type: "card", text: `${c.name} kartınızın kullanım oranı %${c.usagePct} — kritik seviyede.` });
    else if (c.limit > 0 && c.usagePct >= 80) alerts.push({ level: "amber", type: "card", text: `${c.name} kartınızın kullanım oranı %${c.usagePct}.` });
  });
  loansComputed.forEach((l) => {
    if (l.nextPaymentDate) {
      const d = daysBetween(todayIso(), l.nextPaymentDate);
      if (d >= 0 && d <= 7) alerts.push({ level: "amber", type: "loan", text: `${l.name} kredisinin bir sonraki taksidi ${d} gün sonra.` });
    }
  });
  budgetProgress.forEach((b) => {
    if (b.over > 0) alerts.push({ level: "red", type: "budget", text: `${b.label} bütçenizi ${Math.round(b.over).toLocaleString("tr-TR")} ₺ aştınız.` });
  });
  if (next30 > 0) alerts.push({ level: "amber", type: "payment", text: `Önümüzdeki 30 gün içinde toplam ${Math.round(next30).toLocaleString("tr-TR")} ₺ ödeme yapmanız gerekiyor.` });
  if (thisMonthIncome > 0 && thisMonthInstallmentDue / thisMonthIncome >= 0.4) {
    alerts.push({ level: thisMonthInstallmentDue / thisMonthIncome >= 0.6 ? "red" : "amber", type: "cashflow", text: `Bu ay ödemeleriniz gelirinizin %${Math.round((thisMonthInstallmentDue / thisMonthIncome) * 100)}'sine ulaştı.` });
  }
  if (thisMonthInstallmentDue > thisMonthIncome) {
    alerts.push({ level: "red", type: "cashflow", text: `Bu ay ödeme yükümlülüğünüz gelirinizden fazla — açık veriyorsunuz.` });
  }
  if (carryOverBalance < 0) {
    alerts.push({ level: "amber", type: "cashflow", text: `Geçen aydan ${Math.round(Math.abs(carryOverBalance)).toLocaleString("tr-TR")} ₺ açık devretti.` });
  }
  return alerts;
}

/* ----------------------------------------------------------------------
   Mükerrer kayıt tespiti
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
   Otomatik kategori önerisi
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

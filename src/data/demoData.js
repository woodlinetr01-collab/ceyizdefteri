import { uid, nowIso, addDaysToDate } from "../lib/formatUtils.js";
import { generateInstallmentLines, generateLoanInstallments } from "../lib/financeEngine.js";

/** Boş (gerçek kullanıcı) başlangıç durumu. */
export function buildEmptyState() {
  return {
    transactions: [],
    installments: [],
    cards: [],
    loans: [],
    loanInstallments: [],
    debts: [],
    recurringRules: [],
    categoryBudgets: {},
    trash: [],
    meta: { dataMode: "empty", onboarded: true, profile: null, createdAt: nowIso() },
  };
}

/** "Demo Verileriyle Başla" seçildiğinde kullanılan örnek veri seti. */
export function buildDemoState() {
  const TODAY = new Date().toISOString().slice(0, 10);
  const transactions = [];
  const installments = [];

  const pushExpense = (t) => {
    const tx = {
      id: uid("tx"), type: "expense", origin: "manual", whoAdded: "me", note: "", deletedAt: null,
      createdAt: nowIso(), updatedAt: nowIso(), isInstallment: false, downPayment: 0, cardId: null,
      ...t,
    };
    transactions.push(tx);
    installments.push(
      ...generateInstallmentLines({
        transactionId: tx.id, totalAmount: tx.totalAmount, downPayment: tx.downPayment || 0,
        isInstallment: tx.isInstallment, cardId: tx.cardId, installmentCount: tx.installmentCount,
        firstInstallmentDate: tx.firstInstallmentDate, installmentPeriod: tx.installmentPeriod, txDate: tx.date,
      }).map((l, idx) => (idx === 0 && tx.paidFirst ? { ...l, payments: [{ id: uid("pay"), amount: l.amount, date: tx.date, method: "Demo" }] } : l))
    );
  };

  const pushIncome = (i) => transactions.push({
    id: uid("tx"), type: "income", origin: "manual", whoAdded: "me", note: "", deletedAt: null,
    createdAt: nowIso(), updatedAt: nowIso(), cardId: null, group: null, category: null, ...i,
  });

  ["-4", "-3", "-2", "-1", "0"].forEach((k) => {
    pushIncome({ desc: "Maaş", totalAmount: 75000, source: "Maaş", date: addMonths(TODAY, Number(k)), incomeStatus: "Alındı" });
  });
  pushIncome({ desc: "Maaş", totalAmount: 75000, source: "Maaş", date: addMonths(TODAY, 1), incomeStatus: "Alınmadı" });
  pushIncome({ desc: "Yıl Sonu Primi", totalAmount: 20000, source: "Prim", date: TODAY, incomeStatus: "Alındı" });
  pushIncome({ desc: "Aile Desteği - Düğün", totalAmount: 100000, source: "Aile Desteği", date: addDaysToDate(TODAY, 6), incomeStatus: "Alınmadı" });

  const cards = [
    { id: "card_garanti", name: "Garanti Bonus", bank: "Garanti BBVA", limit: 175000, statementDay: 15, dueDay: 22, existingDebt: 0, existingDebtIncludesHistory: false, baselineDate: null, last4: "4821", color: "#8A6A24", description: "", deletedAt: null },
    { id: "card_akbank", name: "Akbank Axess", bank: "Akbank", limit: 150000, statementDay: 5, dueDay: 12, existingDebt: 15000, existingDebtIncludesHistory: true, baselineDate: addDaysToDate(TODAY, -3), last4: "1190", color: "#152238", description: "Ortak harcama kartı", deletedAt: null },
  ];

  // Düğün — peşinat + taksit senaryosu (ilk taksit ödenmiş)
  pushExpense({ group: "dugun", category: "salon", desc: "Düğün Salonu", totalAmount: 150000, isInstallment: true, downPayment: 50000, date: addMonths(TODAY, -1), installmentCount: 5, firstInstallmentDate: addMonths(TODAY, 1), installmentPeriod: "aylik", paymentMethod: "Kredi Kartı", cardId: "card_garanti", paidFirst: false });
  pushExpense({ group: "dugun", category: "gelinlik", desc: "Gelinlik", totalAmount: 65000, isInstallment: false, date: addMonths(TODAY, -1), paymentMethod: "Nakit", paidFirst: true });
  pushExpense({ group: "dugun", category: "fotografci", desc: "Fotoğrafçı Kaparo", totalAmount: 15000, isInstallment: false, date: addDaysToDate(TODAY, 4), paymentMethod: "Banka Havalesi" });
  pushExpense({ group: "dugun", category: "kuafor", desc: "Gelin Saçı & Makyaj", totalAmount: 12000, isInstallment: false, date: addDaysToDate(TODAY, 11), paymentMethod: "Nakit" });
  pushExpense({ group: "dugun", category: "davetiye", desc: "Davetiyeler", totalAmount: 6500, isInstallment: false, date: addMonths(TODAY, -1), paymentMethod: "Kredi Kartı", cardId: "card_akbank", paidFirst: true });
  pushExpense({ group: "dugun", category: "balayi", desc: "Balayı - Antalya", totalAmount: 55000, isInstallment: true, downPayment: 15000, date: addDaysToDate(TODAY, -4), installmentCount: 4, firstInstallmentDate: addMonths(TODAY, 2), installmentPeriod: "aylik", paymentMethod: "Kredi Kartı", cardId: "card_akbank" });

  // Ev kurma
  pushExpense({ group: "ev", category: "mobilya", desc: "Yatak Odası Takımı", totalAmount: 120000, isInstallment: true, downPayment: 20000, date: addDaysToDate(TODAY, -9), installmentCount: 6, firstInstallmentDate: addMonths(TODAY, 1), installmentPeriod: "aylik", paymentMethod: "Kredi Kartı", cardId: "card_akbank" });
  pushExpense({ group: "ev", category: "beyaz_esya", desc: "Beyaz Eşya Seti", totalAmount: 60000, isInstallment: true, downPayment: 0, date: addDaysToDate(TODAY, 6), installmentCount: 6, firstInstallmentDate: addDaysToDate(TODAY, 6), installmentPeriod: "aylik", paymentMethod: "Kredi Kartı", cardId: "card_garanti" });
  pushExpense({ group: "ev", category: "elektronik", desc: "Televizyon", totalAmount: 30000, isInstallment: true, downPayment: 0, date: addMonths(TODAY, 1), installmentCount: 3, firstInstallmentDate: addMonths(TODAY, 1), installmentPeriod: "aylik", paymentMethod: "Kredi Kartı", cardId: "card_akbank" });
  pushExpense({ group: "ev", category: "mobilya", desc: "Koltuk Takımı", totalAmount: 90000, isInstallment: true, downPayment: 0, date: addMonths(TODAY, 2), installmentCount: 9, firstInstallmentDate: addMonths(TODAY, 2), installmentPeriod: "aylik", paymentMethod: "Banka Havalesi" });
  pushExpense({ group: "ev", category: "mutfak", desc: "Mutfak Gereçleri", totalAmount: 9500, isInstallment: false, date: addDaysToDate(TODAY, -6), paymentMethod: "Banka Kartı", paidFirst: true });
  pushExpense({ group: "ev", category: "dekorasyon", desc: "Aydınlatma & Perde", totalAmount: 14000, isInstallment: false, date: addMonths(TODAY, 1), paymentMethod: "Nakit" });

  // Genel yaşam giderleri (nakit akışı grafiğini anlamlı kılmak için)
  ["-3", "-2", "-1", "0"].forEach((k) => {
    pushExpense({ group: "diger", category: "kira", desc: "Kira", totalAmount: 25000, isInstallment: false, date: addMonths(TODAY, Number(k)), paymentMethod: "Banka Havalesi", paidFirst: Number(k) < 0 });
    pushExpense({ group: "diger", category: "fatura", desc: "Faturalar", totalAmount: 3200, isInstallment: false, date: addDaysToDate(addMonths(TODAY, Number(k)), 8), paymentMethod: "Banka Kartı", paidFirst: Number(k) < 0 });
  });
  pushExpense({ group: "diger", category: "ulasim", desc: "Araç Bakım", totalAmount: 4200, isInstallment: false, date: addDaysToDate(TODAY, -2), paymentMethod: "Nakit", paidFirst: true });

  const debts = [
    { id: uid("debt"), direction: "alacak", person: "Ahmet Yılmaz", amount: 20000, payments: [], dueDate: addDaysToDate(TODAY, 20), note: "Düğün organizasyon avansı iade", deletedAt: null },
    { id: uid("debt"), direction: "borc", person: "Mehmet Kaya", amount: 15000, payments: [], dueDate: addDaysToDate(TODAY, 15), note: "Nakit ödünç", deletedAt: null },
    { id: uid("debt"), direction: "alacak", person: "Ayşe Demir", amount: 8000, payments: [{ id: uid("pay"), amount: 3000, date: TODAY }], dueDate: addDaysToDate(TODAY, 5), note: "Ortak hediye masrafı", deletedAt: null },
  ];

  const recurringRules = [
    { id: uid("rec"), kind: "income", desc: "Maaş", amount: 75000, category: null, group: null, paymentMethod: "Banka Havalesi", cardId: null, startDate: addMonths(TODAY, 1), frequency: "monthly", intervalDays: null, endDate: null, active: true, lastGeneratedDate: null },
    { id: uid("rec"), kind: "expense", desc: "Kira", amount: 25000, category: "kira", group: "diger", paymentMethod: "Banka Havalesi", cardId: null, startDate: addMonths(TODAY, 1), frequency: "monthly", intervalDays: null, endDate: null, active: true, lastGeneratedDate: null },
  ];

  const loans = [
    { id: "loan_konut", name: "Konut Kredisi", bank: "Garanti BBVA", totalAmount: 500000, monthlyPayment: 18500, installmentCount: 36, interestRate: 2.79, firstPaymentDate: addMonths(TODAY, -8), note: "", deletedAt: null, createdAt: nowIso(), updatedAt: nowIso() },
  ];
  const loanInstallments = [];
  loans.forEach((loan) => {
    const schedule = generateLoanInstallments({ loanId: loan.id, installmentCount: loan.installmentCount, monthlyPayment: loan.monthlyPayment, firstPaymentDate: loan.firstPaymentDate });
    schedule.forEach((l, idx) => {
      if (idx < 8) l.payments = [{ id: uid("pay"), amount: l.amount, date: l.dueDate, method: "Demo" }];
      loanInstallments.push(l);
    });
  });

  const categoryBudgets = {
    salon: 160000, gelinlik: 60000, damatlik: 25000, fotografci: 35000, kuafor: 15000,
    davetiye: 7000, cicek: 6000, organizasyon: 20000, muzik: 8000, nikah: 8000, balayi: 65000, konaklama: 10000,
    mobilya: 220000, beyaz_esya: 65000, elektronik: 32000, mutfak: 12000, banyo: 9000, kucuk_ev_aletleri: 6000, dekorasyon: 18000,
    kira: 125000, fatura: 15000, ulasim: 8000, yemek: 15000, diger: 10000,
  };

  return {
    transactions, installments, cards, loans, loanInstallments, debts, recurringRules, categoryBudgets, trash: [],
    meta: { dataMode: "demo", onboarded: true, profile: null, createdAt: nowIso() },
  };
}

function addMonths(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

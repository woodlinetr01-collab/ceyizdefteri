import React, { createContext, useContext, useReducer, useMemo, useEffect, useRef } from "react";
import { loadRaw, saveRaw, migrateIfNeeded } from "../services/storage.js";
import { buildEmptyState, buildDemoState } from "../data/demoData.js";
import { computeSummary, generateInstallmentLines, generateRecurringOccurrences, shiftFutureInstallments } from "../lib/financeEngine.js";
import { nowIso, uid, todayIso } from "../lib/formatUtils.js";

const AppDataCtx = createContext(null);
export const useAppData = () => useContext(AppDataCtx);

function withRecurringApplied(state) {
  let transactions = [...state.transactions];
  let installments = [...state.installments];
  let changed = false;
  (state.recurringRules || []).filter((r) => r.active).forEach((rule) => {
    const occ = generateRecurringOccurrences(rule, transactions, 3);
    if (occ.length) {
      changed = true;
      occ.forEach((tx) => {
        transactions.push(tx);
        if (tx.type === "expense") {
          installments.push(...generateInstallmentLines({ transactionId: tx.id, totalAmount: tx.totalAmount, downPayment: 0, isInstallment: false, cardId: tx.cardId, txDate: tx.date }));
        }
      });
    }
  });
  if (!changed) return state;
  return { ...state, transactions, installments };
}

function reducer(state, action) {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;

    case "INIT_EMPTY":
      return buildEmptyState();
    case "INIT_DEMO":
      return buildDemoState();
    case "CLEAR_DEMO_KEEP_USER_DATA": {
      // Yalnızca origin:'manual' olmayan/demo'dan gelen ve kullanıcı tarafından
      // sonradan hiç düzenlenmemiş kayıtları temizlemek riskli olduğundan,
      // "demo temizle" yalnızca dataMode === 'demo' iken tüm veri setini
      // sıfırlar (madde 3) — kullanıcı gerçek veri girmeye o andan başlar.
      return buildEmptyState();
    }
    case "IMPORT_BACKUP":
      return { ...action.payload, meta: { ...action.payload.meta, dataMode: "restored", onboarded: true } };
    case "RESET_ALL":
      return buildEmptyState();

    case "ADD_TRANSACTION": {
      const ts = nowIso();
      const tx = { id: uid("tx"), origin: "manual", whoAdded: "me", note: "", deletedAt: null, createdAt: ts, updatedAt: ts, ...action.payload };
      let installments = state.installments;
      if (tx.type === "expense") {
        const lines = generateInstallmentLines({
          transactionId: tx.id, totalAmount: tx.totalAmount, downPayment: tx.downPayment || 0,
          isInstallment: !!tx.isInstallment, cardId: tx.cardId, installmentCount: tx.installmentCount,
          firstInstallmentDate: tx.firstInstallmentDate, installmentPeriod: tx.installmentPeriod, txDate: tx.date,
        });
        installments = [...installments, ...lines];
      }
      return { ...state, transactions: [tx, ...state.transactions], installments };
    }

    case "UPDATE_TRANSACTION": {
      const { id, patch, regenerateInstallments } = action.payload;
      const transactions = state.transactions.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t));
      let installments = state.installments;
      if (regenerateInstallments) {
        const tx = transactions.find((t) => t.id === id);
        // Var olan ödemeleri kaybetmemek için: yalnızca hiç ödemesi olmayan
        // eski satırları sil, yeni planı oluştur.
        const oldPaidLines = state.installments.filter((l) => l.transactionId === id && (l.payments || []).length > 0);
        const others = state.installments.filter((l) => l.transactionId !== id);
        const alreadyPaidTotal = oldPaidLines.reduce((s, l) => s + l.payments.reduce((a, p) => a + p.amount, 0), 0);
        const newLines = generateInstallmentLines({
          transactionId: id, totalAmount: Math.max(0, tx.totalAmount - alreadyPaidTotal), downPayment: 0,
          isInstallment: tx.isInstallment && tx.installmentCount > 1, cardId: tx.cardId,
          installmentCount: tx.isInstallment ? Math.max(1, (tx.installmentCount || 1) - oldPaidLines.length) : 1,
          firstInstallmentDate: tx.firstInstallmentDate || tx.date, installmentPeriod: tx.installmentPeriod, txDate: tx.date,
        });
        installments = [...others, ...oldPaidLines, ...newLines];
      }
      return { ...state, transactions, installments };
    }

    case "SOFT_DELETE_TRANSACTION": {
      const transactions = state.transactions.map((t) => (t.id === action.id ? { ...t, deletedAt: nowIso() } : t));
      const installments = state.installments.map((l) => (l.transactionId === action.id ? { ...l, deletedAt: nowIso() } : l));
      return { ...state, transactions, installments };
    }
    case "RESTORE_TRANSACTION": {
      const transactions = state.transactions.map((t) => (t.id === action.id ? { ...t, deletedAt: null } : t));
      const installments = state.installments.map((l) => (l.transactionId === action.id ? { ...l, deletedAt: null } : l));
      return { ...state, transactions, installments };
    }

    case "DUPLICATE_TRANSACTION": {
      const src = state.transactions.find((t) => t.id === action.id);
      if (!src) return state;
      const ts = nowIso();
      const newTx = { ...src, id: uid("tx"), date: action.newDate || todayIso(), createdAt: ts, updatedAt: ts, isInstallment: false, note: src.note };
      let installments = state.installments;
      if (newTx.type === "expense") {
        installments = [...installments, ...generateInstallmentLines({ transactionId: newTx.id, totalAmount: newTx.totalAmount, downPayment: 0, isInstallment: false, cardId: newTx.cardId, txDate: newTx.date })];
      }
      return { ...state, transactions: [newTx, ...state.transactions], installments };
    }

    case "BULK_DELETE_TRANSACTIONS": {
      const ids = new Set(action.ids);
      const transactions = state.transactions.map((t) => (ids.has(t.id) ? { ...t, deletedAt: nowIso() } : t));
      const installments = state.installments.map((l) => (ids.has(l.transactionId) ? { ...l, deletedAt: nowIso() } : l));
      return { ...state, transactions, installments };
    }
    case "BULK_SET_CATEGORY": {
      const ids = new Set(action.ids);
      const transactions = state.transactions.map((t) => (ids.has(t.id) ? { ...t, category: action.category, updatedAt: nowIso() } : t));
      return { ...state, transactions };
    }
    case "BULK_MARK_PAID": {
      const ids = new Set(action.ids);
      const today = todayIso();
      const installments = state.installments.map((l) => (ids.has(l.transactionId) && !l.deletedAt ? { ...l, payments: sumOf(l.payments) >= l.amount ? l.payments : [...(l.payments || []), { id: uid("pay"), amount: l.amount - sumOf(l.payments), date: today, method: "Toplu İşlem" }] } : l));
      return { ...state, installments };
    }

    case "ADD_PAYMENT_TO_LINE": {
      const { lineId, amount, date, method } = action.payload;
      const installments = state.installments.map((l) => (l.id === lineId ? { ...l, payments: [...(l.payments || []), { id: uid("pay"), amount, date, method }], updatedAt: nowIso() } : l));
      return { ...state, installments };
    }
    case "REMOVE_LAST_PAYMENT_FROM_LINE": {
      const installments = state.installments.map((l) => {
        if (l.id !== action.lineId || !(l.payments || []).length) return l;
        return { ...l, payments: l.payments.slice(0, -1), updatedAt: nowIso() };
      });
      return { ...state, installments };
    }
    case "TOGGLE_LINE_CANCELLED": {
      const installments = state.installments.map((l) => (l.id === action.lineId ? { ...l, cancelled: !l.cancelled, updatedAt: nowIso() } : l));
      return { ...state, installments };
    }
    case "SET_LINE_DUE_DATE": {
      const { lineId, dueDate, shiftFollowing } = action.payload;
      const target = state.installments.find((l) => l.id === lineId);
      if (!target) return state;
      const delta = daysDiff(target.dueDate, dueDate);
      let installments = state.installments.map((l) => (l.id === lineId ? { ...l, dueDate, updatedAt: nowIso() } : l));
      if (shiftFollowing) {
        installments = installments.map((l) =>
          l.transactionId === target.transactionId && l.no > target.no && sumOf(l.payments) < l.amount
            ? { ...l, dueDate: addDaysIso(l.dueDate, delta), updatedAt: nowIso() }
            : l
        );
      }
      return { ...state, installments };
    }

    case "ADD_INCOME": {
      const ts = nowIso();
      const tx = { id: uid("tx"), type: "income", origin: "manual", whoAdded: "me", note: "", deletedAt: null, createdAt: ts, updatedAt: ts, group: null, category: null, cardId: null, ...action.payload };
      return { ...state, transactions: [tx, ...state.transactions] };
    }
    case "TOGGLE_INCOME_STATUS": {
      const transactions = state.transactions.map((t) => (t.id === action.id ? { ...t, incomeStatus: t.incomeStatus === "Alındı" ? "Alınmadı" : "Alındı", updatedAt: nowIso() } : t));
      return { ...state, transactions };
    }

    case "ADD_TRANSFER": {
      const ts = nowIso();
      const tx = { id: uid("tx"), type: "transfer", origin: "manual", whoAdded: "me", note: "", deletedAt: null, createdAt: ts, updatedAt: ts, group: null, category: null, cardId: null, ...action.payload };
      return { ...state, transactions: [tx, ...state.transactions] };
    }

    case "ADD_CARD":
      return { ...state, cards: [...state.cards, { id: uid("card"), deletedAt: null, ...action.payload }] };
    case "UPDATE_CARD":
      return { ...state, cards: state.cards.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) };
    case "DELETE_CARD": {
      const { id, reassignToCardId } = action.payload;
      let transactions = state.transactions;
      if (reassignToCardId) {
        transactions = transactions.map((t) => (t.cardId === id ? { ...t, cardId: reassignToCardId, updatedAt: nowIso() } : t));
      } else {
        transactions = transactions.map((t) => (t.cardId === id ? { ...t, cardId: null, paymentMethod: "Diğer", updatedAt: nowIso() } : t));
      }
      const cards = state.cards.map((c) => (c.id === id ? { ...c, deletedAt: nowIso() } : c));
      return { ...state, cards, transactions };
    }

    case "ADD_DEBT":
      return { ...state, debts: [{ id: uid("debt"), payments: [], deletedAt: null, ...action.payload }, ...state.debts] };
    case "UPDATE_DEBT":
      return { ...state, debts: state.debts.map((d) => (d.id === action.id ? { ...d, ...action.patch } : d)) };
    case "SOFT_DELETE_DEBT":
      return { ...state, debts: state.debts.map((d) => (d.id === action.id ? { ...d, deletedAt: nowIso() } : d)) };
    case "RESTORE_DEBT":
      return { ...state, debts: state.debts.map((d) => (d.id === action.id ? { ...d, deletedAt: null } : d)) };
    case "ADD_PAYMENT_TO_DEBT": {
      const { debtId, amount, date } = action.payload;
      return { ...state, debts: state.debts.map((d) => (d.id === debtId ? { ...d, payments: [...(d.payments || []), { id: uid("pay"), amount, date }] } : d)) };
    }

    case "ADD_RECURRING":
      return { ...state, recurringRules: [{ id: uid("rec"), active: true, lastGeneratedDate: null, ...action.payload }, ...state.recurringRules] };
    case "UPDATE_RECURRING":
      return { ...state, recurringRules: state.recurringRules.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)) };
    case "DELETE_RECURRING":
      return { ...state, recurringRules: state.recurringRules.filter((r) => r.id !== action.id) };

    case "SET_BUDGET":
      return { ...state, categoryBudgets: { ...state.categoryBudgets, [action.category]: action.amount } };

    case "APPLY_RECURRING":
      return withRecurringApplied(state);

    default:
      return state;
  }
}
function sumOf(payments) { return (payments || []).reduce((s, p) => s + (p.amount || 0), 0); }
function daysDiff(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function addDaysIso(dateStr, n) { const d = new Date(`${dateStr}T00:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

export function AppDataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    const stored = migrateIfNeeded(loadRaw());
    return stored || buildEmptyState();
  });
  const hydrated = useRef(false);

  // İlk yüklemede düzenli işlemlerin gelecek somut kayıtlarını üret.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      dispatch({ type: "APPLY_RECURRING" });
    }
  }, []);

  useEffect(() => {
    saveRaw(state);
  }, [state]);

  const calc = useMemo(() => computeSummary(state), [state]);
  const needsOnboarding = !state.meta || !state.meta.onboarded;

  const value = useMemo(() => ({ state, dispatch, calc, needsOnboarding }), [state, calc, needsOnboarding]);

  return <AppDataCtx.Provider value={value}>{children}</AppDataCtx.Provider>;
}

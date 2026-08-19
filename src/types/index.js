/**
 * Bu proje JavaScript ile yazılmıştır (TypeScript'e geçiş istenirse bu dosya
 * doğrudan .ts tip tanımlarına çevrilebilir). Aşağıdaki JSDoc typedef'leri,
 * tüm servis ve bileşenlerin ortak veri sözleşmesini (contract) belgeler.
 *
 * @typedef {Object} Payment
 * @property {string} id
 * @property {number} amount
 * @property {string} date - YYYY-MM-DD
 * @property {string} [method]
 *
 * @typedef {Object} InstallmentLine
 * @property {string} id
 * @property {string} transactionId
 * @property {number} no - 0 = peşinat, 1..N = taksit sırası
 * @property {number} of - toplam taksit adedi
 * @property {string} dueDate - YYYY-MM-DD
 * @property {number} amount
 * @property {'bekliyor'|'odendi'|'gecikti'|'iptal'} status
 * @property {Payment[]} payments
 * @property {string|null} cardId
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {'income'|'expense'|'transfer'} type
 * @property {'manual'|'recurring'|'import'} origin
 * @property {'dugun'|'ev'|'diger'|null} group
 * @property {string|null} category
 * @property {string} desc
 * @property {number} totalAmount
 * @property {string} date
 * @property {string|null} paymentMethod
 * @property {string|null} cardId
 * @property {boolean} isInstallment
 * @property {number} [downPayment]
 * @property {number} [installmentCount]
 * @property {string} [installmentPeriod]
 * @property {string} [fromAccount] - yalnızca transfer
 * @property {string} [toAccount] - yalnızca transfer
 * @property {'Alındı'|'Alınmadı'} [incomeStatus] - yalnızca income
 * @property {string} whoAdded - 'me' | 'partner' | 'shared'
 * @property {string} note
 * @property {string|null} deletedAt
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * @typedef {Object} CreditCard
 * @property {string} id
 * @property {string} name
 * @property {string} bank
 * @property {number} limit
 * @property {number} statementDay
 * @property {number} dueDay
 * @property {number} existingDebt
 *
 * @typedef {Object} Debt
 * @property {string} id
 * @property {'borc'|'alacak'} direction
 * @property {string} person
 * @property {number} amount
 * @property {Payment[]} payments
 * @property {string} dueDate
 * @property {'Bekliyor'|'Kısmen Ödendi'|'Tamamlandı'} status
 * @property {string} note
 *
 * @typedef {Object} RecurringRule
 * @property {string} id
 * @property {'income'|'expense'} kind
 * @property {string} desc
 * @property {number} amount
 * @property {string|null} category
 * @property {string|null} group
 * @property {string|null} paymentMethod
 * @property {string|null} cardId
 * @property {string} startDate
 * @property {'monthly'|'weekly'|'yearly'|'custom'} frequency
 * @property {number} [intervalDays]
 * @property {string|null} endDate
 * @property {boolean} active
 */
export {};

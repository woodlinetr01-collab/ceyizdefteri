// ============================================================================
// PREMIUM / FEATURE-FLAG SİSTEMİ
//
// DURUM: Bu dosya, ücretli özellik SINIRLARINI ve FİYATLANDIRMAYI merkezi
// olarak yönetir (madde 45-47, 67). Gerçek ödeme altyapısı (App Store / Google
// Play In-App Purchase ya da Stripe) bu sandbox'ta kurulamaz — bunlar Apple/
// Google geliştirici hesabı ve canlı bir ödeme sağlayıcısı gerektirir.
//
// Burada NE ÇALIŞIYOR:
//   - Kullanıcının plan durumu (free/trial/premium/cancelled) localStorage'da
//     tutulur ve tüm uygulama bu duruma göre GERÇEKTEN kısıtlanır/açılır.
//   - "7 gün deneme" mantığı gerçek tarih hesabıyla çalışır.
//   - Fiyatlar tek yerden değiştirilir (PRICING).
//
// NE ZAMAN GERÇEK PARA GEÇER (yapılacaklar):
//   1) Web'de kredi kartıyla ödeme almak isterseniz Stripe hesabı açıp
//      services/billing.js içine Checkout entegrasyonu eklenmeli.
//   2) Mobil (Capacitor) üzerinden App Store/Play'de satış yapmak isterseniz
//      RevenueCat veya native StoreKit/Billing entegrasyonu gerekir — bunlar
//      için Apple Developer (99$/yıl) ve Google Play Console (25$ tek sefer)
//      hesapları şarttır.
//   Her iki durumda da yapılacak tek şey setPlan(...) çağrısını gerçek
//   webhook/purchase callback'inden tetiklemek; UI tarafında değişiklik
//   gerekmez çünkü tüm ekranlar zaten usePremium() hook'unu kullanıyor.
// ============================================================================

import { FREE_LIMITS } from "../lib/constants.js";

export const PLAN = { FREE: "free", TRIAL: "trial", PREMIUM: "premium", CANCELLED: "cancelled" };

// Fiyatları buradan değiştirin — uygulamanın her yerinde otomatik yansır.
export const PRICING = {
  currency: "TRY",
  monthly: { amount: 69.9, label: "69,90 TL / ay" },
  yearly: { amount: 499, label: "499 TL / yıl", badge: "%40 tasarruf" },
  trialDays: 7,
};

const KEY = "ceyiz_defteri_subscription_v1";

export function loadSubscription() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { plan: PLAN.FREE, startedAt: null, trialEndsAt: null };
    return JSON.parse(raw);
  } catch {
    return { plan: PLAN.FREE, startedAt: null, trialEndsAt: null };
  }
}

export function saveSubscription(sub) {
  localStorage.setItem(KEY, JSON.stringify(sub));
}

export function startTrial() {
  const trialEndsAt = new Date(Date.now() + PRICING.trialDays * 86400000).toISOString();
  const sub = { plan: PLAN.TRIAL, startedAt: new Date().toISOString(), trialEndsAt };
  saveSubscription(sub);
  return sub;
}

export function activatePremium(cycle = "monthly") {
  const sub = { plan: PLAN.PREMIUM, startedAt: new Date().toISOString(), cycle, trialEndsAt: null };
  saveSubscription(sub);
  return sub;
}

export function cancelPremium() {
  const sub = { ...loadSubscription(), plan: PLAN.CANCELLED };
  saveSubscription(sub);
  return sub;
}

/** Trial süresi dolmuşsa otomatik olarak free'ye düşürür. */
export function resolveSubscription() {
  const sub = loadSubscription();
  if (sub.plan === PLAN.TRIAL && sub.trialEndsAt && new Date(sub.trialEndsAt) < new Date()) {
    const downgraded = { plan: PLAN.FREE, startedAt: null, trialEndsAt: null };
    saveSubscription(downgraded);
    return downgraded;
  }
  return sub;
}

export function isPremiumActive(sub) {
  return sub.plan === PLAN.PREMIUM || sub.plan === PLAN.TRIAL;
}

/** Bir özelliğin kullanılabilir olup olmadığını, mevcut veri hacmiyle birlikte kontrol eder. */
export function checkLimit(feature, sub, state) {
  if (isPremiumActive(sub)) return { allowed: true };
  switch (feature) {
    case "addTransaction": {
      const count = state.transactions.filter((t) => !t.deletedAt).length;
      return count < FREE_LIMITS.maxTransactions
        ? { allowed: true }
        : { allowed: false, reason: `Ücretsiz planda en fazla ${FREE_LIMITS.maxTransactions} işlem kaydedebilirsiniz. Premium ile sınırsız işlem ekleyin.` };
    }
    case "addCard": {
      const count = state.cards.filter((c) => !c.deletedAt).length;
      return count < FREE_LIMITS.maxCreditCards
        ? { allowed: true }
        : { allowed: false, reason: `Ücretsiz planda en fazla ${FREE_LIMITS.maxCreditCards} kredi kartı ekleyebilirsiniz. Premium ile sınırsız kart kullanabilirsiniz.` };
    }
    case "addInstallmentPlan": {
      const count = state.transactions.filter((t) => !t.deletedAt && t.isInstallment).length;
      return count < FREE_LIMITS.maxInstallmentPlans
        ? { allowed: true }
        : { allowed: false, reason: `Ücretsiz planda en fazla ${FREE_LIMITS.maxInstallmentPlans} taksitli plan oluşturabilirsiniz. Premium ile sınırsız taksit planı kurun.` };
    }
    case "coupleAccount":
      return { allowed: false, reason: "Ortak hesap (eş daveti) Premium bir özelliktir." };
    case "aiAssistant":
      return { allowed: false, reason: "AI Finans Asistanı Premium bir özelliktir." };
    case "exportPdfExcel":
      return { allowed: false, reason: "PDF/Excel dışa aktarma Premium bir özelliktir. CSV/JSON dışa aktarma ücretsizdir." };
    case "statementImport":
      return { allowed: false, reason: "Ekstre içe aktarma Premium bir özelliktir." };
    default:
      return { allowed: true };
  }
}

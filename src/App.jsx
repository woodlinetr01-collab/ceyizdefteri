import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAppData } from "./contexts/AppDataContext.jsx";
import * as lockService from "./services/lockService.js";

import Sidebar from "./components/layout/Sidebar.jsx";
import QuickActionFab from "./components/layout/QuickActionFab.jsx";
import LockScreen from "./components/layout/LockScreen.jsx";

import LandingPage from "./pages/LandingPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import TransactionsPage from "./pages/TransactionsPage.jsx";
import IncomePage from "./pages/IncomePage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import CardsPage from "./pages/CardsPage.jsx";
import BudgetPage from "./pages/BudgetPage.jsx";
import DebtsPage from "./pages/DebtsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import AssistantPage from "./pages/AssistantPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import PremiumPage from "./pages/PremiumPage.jsx";
import { PrivacyPage, TermsPage, KvkkPage, CookiesPage, SubscriptionTermsPage } from "./pages/legal/LegalPages.jsx";
import { Heart, Home as HomeIcon } from "lucide-react";

// Uygulamanın tamamı "/app" altında yaşar; "/" pazarlama (landing) sayfasıdır.
// NOT: İç navigasyon linkleri (Sidebar, FAB, modal içi yönlendirmeler) bu
// yüzden her zaman "/app/..." kök-mutlak yollarını kullanır — React Router
// v6'da "/" ile başlayan bir yol, iç içe route'larda bile her zaman site
// KÖKÜNDEN itibaren mutlaktır.

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">{children}</main>
      <QuickActionFab />
    </div>
  );
}

function AuthenticatedApp() {
  const { needsOnboarding } = useAppData();
  const [locked, setLocked] = useState(lockService.isLockEnabled());

  if (needsOnboarding) return <OnboardingPage />;
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;

  return (
    <AppShell>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="islemler" element={<TransactionsPage />} />
        <Route path="gelirler" element={<IncomePage />} />
        <Route path="takvim" element={<CalendarPage />} />
        <Route path="kartlar" element={<CardsPage />} />
        <Route path="dugun" element={<BudgetPage group="dugun" title="Düğün Bütçesi" kicker="Modül" icon={Heart} />} />
        <Route path="ev" element={<BudgetPage group="ev" title="Ev Kurma Bütçesi" kicker="Modül" icon={HomeIcon} />} />
        <Route path="borclar" element={<DebtsPage />} />
        <Route path="raporlar" element={<ReportsPage />} />
        <Route path="asistan" element={<AssistantPage />} />
        <Route path="bildirimler" element={<NotificationsPage />} />
        <Route path="ayarlar" element={<SettingsPage />} />
        <Route path="premium" element={<PremiumPage />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/giris" element={<AuthPage />} />
      <Route path="/gizlilik" element={<PrivacyPage />} />
      <Route path="/kullanim-kosullari" element={<TermsPage />} />
      <Route path="/kvkk" element={<KvkkPage />} />
      <Route path="/cerez-politikasi" element={<CookiesPage />} />
      <Route path="/abonelik-kosullari" element={<SubscriptionTermsPage />} />
      <Route path="/app/*" element={<AuthenticatedApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, CreditCard as CardIcon, CalendarDays,
  Heart, Home as HomeIcon, Users, FileBarChart, Bell, Settings as SettingsIcon,
  Sparkles, MessageCircleQuestion,
} from "lucide-react";
import { fmtDate, todayIso } from "../../lib/formatUtils.js";

const NAV = [
  { to: "/app", label: "Panel", icon: LayoutDashboard, end: true },
  { to: "/app/islemler", label: "İşlemler", icon: ArrowLeftRight },
  { to: "/app/gelirler", label: "Gelirler", icon: Wallet },
  { to: "/app/takvim", label: "Takvim", icon: CalendarDays },
  { to: "/app/kartlar", label: "Kredi Kartları", icon: CardIcon },
  { to: "/app/dugun", label: "Düğün Bütçesi", icon: Heart },
  { to: "/app/ev", label: "Ev Bütçesi", icon: HomeIcon },
  { to: "/app/borclar", label: "Borç & Alacak", icon: Users },
  { to: "/app/raporlar", label: "Raporlar", icon: FileBarChart },
  { to: "/app/asistan", label: "Finans Asistanı", icon: MessageCircleQuestion },
  { to: "/app/bildirimler", label: "Bildirimler", icon: Bell },
  { to: "/app/ayarlar", label: "Ayarlar", icon: SettingsIcon },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Sparkles size={16} strokeWidth={1.6} /></div>
        <div>
          <div className="brand-name">Çeyiz Defteri</div>
          <div className="brand-sub">Çift Finans &amp; Düğün Yönetimi</div>
        </div>
      </div>
      <nav>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <n.icon size={17} strokeWidth={1.7} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="today-chip"><CalendarDays size={13} /><span>{fmtDate(todayIso())}</span></div>
        <p>Verileriniz bu cihazda güvenle saklanır. Bulut senkronizasyonu için Ayarlar → Supabase kurulum notuna bakın.</p>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, roleLabel } from "@/lib/auth";
import { Icon } from "./Icon";

interface NavItem { href: string; label: string; icon: string }

const GROUPS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/", label: "Overview", icon: "dashboard" },
      { href: "/users", label: "Users", icon: "users" },
      { href: "/support", label: "Support inbox", icon: "inbox" },
      { href: "/analytics", label: "Analytics", icon: "flag" },
    ],
  },
  {
    title: "CONTENT",
    items: [
      { href: "/paths", label: "Paths & weeks", icon: "layers" },
      { href: "/lessons", label: "Lessons", icon: "play" },
      { href: "/resources", label: "Resources", icon: "book" },
      { href: "/missions", label: "Mission plans", icon: "calendar" },
      { href: "/journeys", label: "Journeys", icon: "route" },
      { href: "/onboarding", label: "Onboarding", icon: "compass" },
    ],
  },
  {
    title: "GROWTH",
    items: [
      { href: "/outreach", label: "Outreach", icon: "send" },
      { href: "/gbp-criteria", label: "GBP audit", icon: "check" },
      { href: "/pricing", label: "Pricing & generator", icon: "calculator" },
      { href: "/coach", label: "Coach", icon: "chat" },
      { href: "/mentor-check", label: "Mentor check", icon: "shield" },
      { href: "/achievements", label: "Achievements", icon: "trophy" },
      { href: "/notifications", label: "Push notifications", icon: "bell" },
      { href: "/help", label: "Help & FAQ", icon: "help" },
      { href: "/subscription", label: "Subscription", icon: "card" },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { href: "/settings", label: "Settings", icon: "settings" },
      { href: "/feature-flags", label: "Feature flags", icon: "flag" },
      { href: "/staff", label: "Staff", icon: "key" },
      { href: "/audit", label: "Audit log", icon: "list" },
      { href: "/maintenance", label: "Maintenance", icon: "wrench" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="w-[236px] h-screen bg-card border-r border-line flex flex-col shrink-0">
      <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet grid place-items-center text-white shadow-[0_6px_16px_-6px_rgba(124,58,237,.6)]">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h4l4 11 4-11h4l-6 16h-4L4 4z" /></svg>
        </span>
        <div className="leading-tight">
          <p className="text-[15px] font-bold text-fg tracking-tight">Vaulten</p>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted">ADMIN</p>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto pb-2">
        {GROUPS.map((g, gi) => (
          <div key={gi} className={gi ? "mt-5" : ""}>
            {g.title && <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-faint">{g.title}</p>}
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition ${active ? "bg-primary-light text-primary-text" : "text-muted hover:text-fg hover:bg-sunken"}`}>
                    <Icon name={item.icon} className={`w-[17px] h-[17px] ${active ? "" : "opacity-75 group-hover:opacity-100"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4 mt-2 border-t border-line pt-3">
        <div className="px-2 mb-1.5 leading-tight">
          <p className="text-[13px] font-semibold text-fg truncate">{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email}</p>
          <p className="text-[11px] text-muted truncate">{roleLabel(user?.role)} · {user?.email}</p>
        </div>
        <button onClick={() => void logout()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-muted hover:text-danger hover:bg-danger/10 transition cursor-pointer">
          <Icon name="logout" className="w-4 h-4" /> Log out
        </button>
      </div>
    </aside>
  );
}

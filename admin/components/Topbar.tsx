"use client";

import { useAuth, roleLabel } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import type { ReactNode } from "react";
import { Avatar } from "./ui";
import { Icon } from "./Icon";

export default function Topbar({ title, subtitle, pill, actions }: { title: string; subtitle?: ReactNode; pill?: ReactNode; actions?: ReactNode }) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Admin";
  return (
    <header className="flex items-center gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold text-fg tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="hidden lg:block text-[13px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {pill && <span className="hidden sm:inline-flex items-center gap-2 text-xs font-medium text-muted bg-card border border-line rounded-lg px-3 py-1.5">{pill}</span>}
      <div className="ml-auto flex items-center gap-3">
        {actions}
        <div role="group" aria-label="Theme" className="flex items-center gap-1 bg-card border border-line rounded-full p-1">
          <button type="button" onClick={() => setTheme("light")} aria-pressed={theme === "light"} title="Light" className={`w-7 h-7 rounded-full grid place-items-center transition cursor-pointer ${theme === "light" ? "bg-primary text-white" : "text-muted hover:text-fg"}`}><Icon name="sun" className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => setTheme("dark")} aria-pressed={theme === "dark"} title="Dark" className={`w-7 h-7 rounded-full grid place-items-center transition cursor-pointer ${theme === "dark" ? "bg-primary text-white" : "text-muted hover:text-fg"}`}><Icon name="moon" className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex items-center gap-2.5 pl-1">
          <Avatar name={name} hue={265} />
          <div className="hidden md:block leading-tight">
            <p className="text-sm font-semibold text-fg truncate max-w-[10rem]">{name}</p>
            <p className="text-[11px] text-muted">{roleLabel(user?.role)}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

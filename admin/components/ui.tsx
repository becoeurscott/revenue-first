"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** The shared primitives. One file on purpose: no component library. */

export type Tone = "primary" | "accent" | "success" | "danger" | "warning" | "info" | "neutral";

const TONE: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary-text",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  neutral: "bg-sunken text-muted",
};

export function Badge({ children, tone = "neutral", title, dot }: { children: ReactNode; tone?: Tone; title?: string; dot?: boolean }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md font-semibold whitespace-nowrap ${TONE[tone]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function statusTone(s?: string | null): Tone {
  switch (s) {
    case "PUBLISHED": case "ACTIVE": case "RECORDED": case "WON": case "COMPLETED": return "success";
    case "DRAFT": case "PENDING_VERIFICATION": case "OPEN": case "IN_PROGRESS": return "warning";
    case "ARCHIVED": case "SUSPENDED": case "VOIDED": case "LOST": case "DELETED": return "danger";
    default: return "neutral";
  }
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? "bg-success" : "bg-line"} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export function Card({ children, className = "", title, subtitle, actions, pad = true }: { children: ReactNode; className?: string; title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; pad?: boolean }) {
  return (
    <section className={`card ${pad ? "p-5" : ""} ${className}`}>
      {(title || actions) && (
        <header className={`flex items-start gap-3 mb-4 ${pad ? "" : "px-5 pt-5"}`}>
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-bold text-fg tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="ml-auto flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className={`card p-6 w-full max-h-[88vh] overflow-y-auto ${wide ? "max-w-3xl" : "max-w-md"}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-fg mb-4">{title}</h2>
        {children}
        {footer && <div className="flex gap-2 mt-5 pt-4 border-t border-line">{footer}</div>}
      </div>
    </div>
  );
}

/** Right-side editor drawer for wide forms. Warns before closing with unsaved changes. */
export function Drawer({ open, onClose, title, children, dirty, footer, width = "max-w-3xl" }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; dirty?: boolean; footer?: ReactNode; width?: string }) {
  const tryClose = () => {
    if (dirty && !window.confirm("You have unsaved changes. Close anyway?")) return;
    onClose();
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && tryClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dirty]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={tryClose}>
      <div role="dialog" aria-modal="true" className={`bg-card h-full w-full ${width} shadow-2xl flex flex-col border-l border-line`} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-3 px-6 py-4 border-b border-line">
          <h2 className="text-base font-bold text-fg truncate">{title}</h2>
          {dirty && <Badge tone="warning">Unsaved</Badge>}
          <button onClick={tryClose} className="ml-auto w-8 h-8 rounded-lg grid place-items-center text-muted hover:bg-sunken cursor-pointer" aria-label="Close">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex items-center gap-2 px-6 py-4 border-t border-line bg-card">{footer}</footer>}
      </div>
    </div>
  );
}

/** Typed confirmation for irreversible actions; the phrase is also sent as `x-confirm`. */
export function ConfirmDialog({ open, onClose, onConfirm, title, body, phrase, confirmLabel = "Confirm", busy, tone = "danger" }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; phrase?: string; confirmLabel?: string; busy?: boolean; tone?: Tone }) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);
  const ok = !phrase || typed.trim() === phrase;
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm text-muted mb-4 space-y-2">{body}</div>
      {phrase && (
        <>
          <label className="block text-sm font-medium text-fg mb-1.5">
            Type <code className="px-1.5 py-0.5 rounded bg-sunken text-danger font-mono">{phrase}</code> to confirm
          </label>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} className="input font-mono" placeholder={phrase} autoFocus />
        </>
      )}
      <div className="flex gap-2 mt-5">
        <Btn tone={tone} solid onClick={onConfirm} disabled={!ok || busy}>{busy ? "Working…" : confirmLabel}</Btn>
        <Btn tone="neutral" onClick={onClose} className="ml-auto">Cancel</Btn>
      </div>
    </Modal>
  );
}

export function Tabs({ tabs, active, onChange, className = "" }: { tabs: { id: string; label: string; count?: number; tone?: Tone }[]; active: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div className={`flex gap-1 border-b border-line overflow-x-auto ${className}`}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={`px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition cursor-pointer ${active === t.id ? "border-primary text-primary-text" : "border-transparent text-muted hover:text-fg"}`}>
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-md bg-sunken text-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Pill-style segmented control (filters, view switches). */
export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-sunken border border-line rounded-xl p-0.5">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={`px-3 py-1.5 text-xs font-semibold rounded-[10px] transition cursor-pointer ${value === o.id ? "bg-card text-fg shadow-sm" : "text-muted hover:text-fg"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children, error, className = "" }: { label: ReactNode; hint?: ReactNode; children: ReactNode; error?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[13px] font-medium text-fg mb-1.5">{label}</label>
      {children}
      {error ? <p className="text-xs text-danger mt-1">{error}</p> : hint ? <p className="text-xs text-faint mt-1">{hint}</p> : null}
    </div>
  );
}

export const inputClass = "input";

const SOLID: Record<Tone, string> = {
  primary: "bg-primary text-white",
  accent: "bg-accent text-white",
  success: "bg-success text-white",
  danger: "bg-danger text-white",
  warning: "bg-warning text-white",
  info: "bg-info text-white",
  neutral: "bg-fg text-bg",
};

export function Btn({ children, onClick, tone = "primary", solid, disabled, size = "md", type = "button", className = "", title }: { children: ReactNode; onClick?: () => void; tone?: Tone; solid?: boolean; disabled?: boolean; size?: "xs" | "sm" | "md"; type?: "button" | "submit"; className?: string; title?: string }) {
  const pad = size === "xs" ? "px-2 py-1 text-[11px]" : size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const look = solid ? SOLID[tone] : tone === "neutral" ? "border border-line bg-card text-fg hover:bg-sunken" : TONE[tone];
  return (
    <button type={type} title={title} onClick={onClick} disabled={disabled} className={`${pad} ${look} rounded-xl font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 ${className}`}>
      {children}
    </button>
  );
}

/** Transient feedback after a write; auto-dismisses success. */
export function Notice({ kind, children, onDismiss }: { kind: "success" | "danger" | "info"; children: ReactNode; onDismiss?: () => void }) {
  useEffect(() => {
    if (kind !== "success" || !onDismiss || !children) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [kind, onDismiss, children]);
  if (!children) return null;
  const look = kind === "success" ? "text-success bg-success/10" : kind === "danger" ? "text-danger bg-danger/10" : "text-info bg-info/10";
  return <p className={`text-sm rounded-xl px-4 py-2.5 ${look}`}>{children}</p>;
}

export function Spinner({ className = "w-7 h-7" }: { className?: string }) {
  return <div className={`${className} border-[3px] border-primary/30 border-t-primary rounded-full animate-spin`} />;
}

/** Loading / error / empty wrapper: no page can get stuck on a spinner. */
export function DataState({ loading, error, empty, emptyLabel = "Nothing here yet.", onRetry, children, minHeight = "min-h-[160px]" }: { loading: boolean; error?: string | null; empty?: boolean; emptyLabel?: ReactNode; onRetry?: () => void; children: ReactNode; minHeight?: string }) {
  if (loading) return <div className={`${minHeight} grid place-items-center`}><Spinner /></div>;
  if (error)
    return (
      <div className={`${minHeight} grid place-items-center text-center`}>
        <div>
          <p className="text-sm text-danger font-medium">{error}</p>
          {onRetry && <Btn tone="neutral" size="sm" onClick={onRetry} className="mt-3">Retry</Btn>}
        </div>
      </div>
    );
  if (empty) return <div className={`${minHeight} grid place-items-center text-sm text-muted`}>{emptyLabel}</div>;
  return <>{children}</>;
}

export function SearchInput({ value, onChange, placeholder = "Search…", className = "w-72" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setLocal(value), [value]);
  return (
    <div className={`relative ${className}`}>
      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M20 20l-3.5-3.5" /></svg>
      <input
        value={local}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => onChange(v), 300);
        }}
        className="input pl-9 bg-card"
      />
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-muted">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString("en-US")}
      </p>
      <div className="flex items-center gap-1">
        <Btn tone="neutral" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Previous</Btn>
        <span className="text-xs text-muted px-2 tabular-nums">{page} / {totalPages}</span>
        <Btn tone="neutral" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Next</Btn>
      </div>
    </div>
  );
}

/** Before/after diff for audit entries and config versions. */
export function JsonDiff({ before, after }: { before: unknown; after: unknown }) {
  const fmt = (v: unknown) => (v === null || v === undefined ? "—" : JSON.stringify(v, null, 2));
  return (
    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
      <div>
        <p className="text-muted mb-1 font-sans font-medium">Before</p>
        <pre className="bg-danger/5 border border-danger/20 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-all">{fmt(before)}</pre>
      </div>
      <div>
        <p className="text-muted mb-1 font-sans font-medium">After</p>
        <pre className="bg-success/5 border border-success/20 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-all">{fmt(after)}</pre>
      </div>
    </div>
  );
}

export function Avatar({ name, size = 36, hue }: { name: string; size?: number; hue?: number }) {
  const initials = name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  const h = hue ?? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span className="rounded-full grid place-items-center text-white font-bold shrink-0" style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 40) % 360} 70% 45%))` }}>
      {initials}
    </span>
  );
}

export function KpiTile({ label, value, delta, hint, children }: { label: string; value: ReactNode; delta?: number | null; hint?: string; children?: ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className="text-[28px] font-bold text-fg tracking-tight mt-2 tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined && delta !== null && (
          <span className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-md ${delta >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export const fmtDate = (d?: string | null, withTime = true) =>
  d ? new Date(d).toLocaleString("en-GB", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }) : "—";

export const fmtMoney = (m?: { amountCents: number; currency: string } | null) =>
  m ? new Intl.NumberFormat("en-US", { style: "currency", currency: m.currency || "USD" }).format(m.amountCents / 100) : "—";

export const fullName = (u: { firstName?: string | null; lastName?: string | null; email?: string }) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—";

/** Local <-> ISO conversion for datetime-local inputs. */
export const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

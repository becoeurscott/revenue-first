"use client";

import { useId, useState } from "react";

/** Dependency-free SVG charts that follow the theme tokens. */

export interface Point { label: string; value: number }
export interface Segment { label: string; value: number; color: string }

const fmt = (n: number) => n.toLocaleString("en-US");

function AxisLabels({ data, centered }: { data: Point[]; centered: boolean }) {
  const n = data.length;
  if (!n) return null;
  const step = Math.max(1, Math.ceil(n / 6));
  const idx: number[] = [];
  for (let i = 0; i < n; i += step) idx.push(i);
  if (idx[idx.length - 1] !== n - 1) idx.push(n - 1);
  return (
    <div className="relative h-4 mt-2 overflow-hidden">
      {idx.map((i) => {
        const x = centered ? ((i + 0.5) / n) * 100 : n > 1 ? (i / (n - 1)) * 100 : 50;
        const shift = x < 4 ? "" : x > 96 ? "-translate-x-full" : "-translate-x-1/2";
        return (
          <span key={i} className={`absolute top-0 ${shift} text-[10px] uppercase tracking-wide text-faint whitespace-nowrap`} style={{ left: `${x}%` }}>
            {data[i].label}
          </span>
        );
      })}
    </div>
  );
}

function YAxis({ max, height }: { max: number; height: number }) {
  const vals = Array.from({ length: 5 }, (_, i) => Math.round((max / 4) * i)).reverse();
  return (
    <div className="flex flex-col justify-between text-[10px] text-faint tabular-nums shrink-0 py-0.5" style={{ height }}>
      {vals.map((v, i) => <span key={i} className="leading-none">{fmt(v)}</span>)}
    </div>
  );
}

export function BarChart({ data, height = 200, color = "var(--color-primary)" }: { data: Point[]; height?: number; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = data.length ? 100 / data.length : 100;
  const gap = barW * 0.4;
  return (
    <div className="flex gap-3">
      <YAxis max={max} height={height} />
      <div className="flex-1 min-w-0">
        <div className="relative" style={{ height }}>
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="border-t border-dashed border-line" />)}
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const x = i * barW + gap / 2;
              const h = (d.value / max) * 100;
              return (
                <g key={i} onMouseEnter={() => setHover(i)}>
                  <rect x={x} y={0} width={barW - gap} height={100} fill="var(--color-line)" opacity={0.5} />
                  <rect x={x} y={100 - h} width={barW - gap} height={h} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} style={{ transition: "opacity .15s" }} />
                </g>
              );
            })}
          </svg>
          {hover !== null && data[hover] && (
            <div className="absolute -top-2 -translate-y-full -translate-x-1/2 px-2.5 py-1.5 rounded-lg bg-fg text-bg text-xs font-semibold shadow-lg pointer-events-none whitespace-nowrap z-10" style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}>
              {fmt(data[hover].value)} <span className="font-normal opacity-70">{data[hover].label}</span>
            </div>
          )}
        </div>
        <AxisLabels data={data} centered />
      </div>
    </div>
  );
}

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return pts.length ? `M${pts[0].x},${pts[0].y}` : "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`;
  }
  return d;
}

export function LineChart({ data, height = 200, color = "var(--color-violet)" }: { data: Point[]; height?: number; color?: string }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const pts = data.map((d, i) => ({ x: data.length > 1 ? (i / (data.length - 1)) * 100 : 50, y: 100 - (d.value / max) * 92 - 4 }));
  const line = smoothPath(pts);
  const area = pts.length ? `${line} L${pts[pts.length - 1].x},100 L${pts[0].x},100 Z` : "";
  return (
    <div className="flex gap-3">
      <YAxis max={max} height={height} />
      <div className="flex-1 min-w-0">
        <div className="relative" style={{ height }}>
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="border-t border-dashed border-line" />)}
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" onMouseLeave={() => setHover(null)}>
            <defs>
              <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${id}-fill)`} />
            <path d={line} fill="none" stroke={color} strokeWidth={2.2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <rect key={i} x={p.x - 50 / Math.max(data.length, 1)} y={0} width={100 / Math.max(data.length, 1)} height={100} fill="transparent" onMouseEnter={() => setHover(i)} />
            ))}
          </svg>
          {hover !== null && pts[hover] && (
            <>
              <div className="absolute top-0 bottom-0 w-px bg-line pointer-events-none" style={{ left: `${pts[hover].x}%` }} />
              <div className="absolute w-3 h-3 rounded-full border-2 bg-card pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: `${pts[hover].x}%`, top: `${pts[hover].y}%`, borderColor: color }} />
              <div className="absolute -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-lg bg-fg text-bg text-xs font-semibold shadow-lg pointer-events-none whitespace-nowrap z-10" style={{ left: `${pts[hover].x}%`, top: `calc(${pts[hover].y}% - 12px)` }}>
                {fmt(data[hover].value)} <span className="font-normal opacity-70">{data[hover].label}</span>
              </div>
            </>
          )}
        </div>
        <AxisLabels data={data} centered={false} />
      </div>
    </div>
  );
}

export function Donut({ segments, size = 96, thickness = 12, center }: { segments: Segment[]; size?: number; thickness?: number; center?: React.ReactNode }) {
  const total = Math.max(segments.reduce((s, x) => s + x.value, 0), 1);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={thickness} opacity={0.6} />
        {segments.map((s) => {
          const len = (s.value / total) * c;
          const el = <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          offset += len;
          return el;
        })}
      </svg>
      {center && <div className="absolute inset-0 grid place-items-center text-center">{center}</div>}
    </div>
  );
}

export function DonutLegend({ segments, inline = false }: { segments: Segment[]; inline?: boolean }) {
  const total = Math.max(segments.reduce((s, x) => s + x.value, 0), 1);
  return (
    <ul className={inline ? "flex flex-wrap gap-x-4 gap-y-1.5" : "space-y-1.5"}>
      {segments.map((s) => (
        <li key={s.label} className="flex items-center gap-2 text-[11px] text-muted">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
          <span className="font-semibold text-fg tabular-nums">{Math.round((s.value / total) * 100)}%</span>
          <span className="truncate">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Horizontal bars for "top N" lists. */
export function HBars({ data, color = "var(--color-primary)" }: { data: Point[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex justify-between text-xs mb-1"><span className="text-fg font-medium truncate">{d.label}</span><span className="text-muted tabular-nums">{fmt(d.value)}</span></div>
          <div className="h-2 rounded-full bg-sunken overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} /></div>
        </li>
      ))}
    </ul>
  );
}

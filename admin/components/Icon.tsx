/** Thin line icons (24px grid). Keeps the dashboard free of icon packages. */
const PATHS: Record<string, string> = {
  dashboard: "M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z",
  users: "M16 11a4 4 0 10-8 0 4 4 0 008 0zm-8 7a6 6 0 0112 0v2H4v-2a4 4 0 014-4m12 4h2v-2a4 4 0 00-3-3.87",
  layers: "M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5M3 16l9 5 9-5",
  play: "M5 4l14 8-14 8V4z",
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zm0 16a2 2 0 002 2h13v-2",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  compass: "M12 21a9 9 0 100-18 9 9 0 000 18zm3.5-12.5l-2 5-5 2 2-5 5-2z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  check: "M9 12l2 2 4-4M12 21a9 9 0 100-18 9 9 0 000 18z",
  route: "M6 19a3 3 0 100-6 3 3 0 000 6zm12-8a3 3 0 100-6 3 3 0 000 6zM6 13V8a3 3 0 013-3h3m6 6v3a3 3 0 01-3 3h-3",
  chat: "M21 12a8 8 0 01-11.6 7.1L4 21l1.9-4.6A8 8 0 1121 12z",
  shield: "M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3zm-3 9l2 2 4-4",
  trophy: "M8 21h8m-4-4v4m-6-18h12v5a6 6 0 01-12 0V3zM6 5H3v2a4 4 0 004 4m11-6h3v2a4 4 0 01-4 4",
  help: "M12 21a9 9 0 100-18 9 9 0 000 18zm-.2-6v-.2c0-1.3.8-2 1.6-2.6.8-.6 1.6-1.2 1.6-2.4a3 3 0 00-6 0M12 18h.01",
  card: "M3 7h18v10H3V7zm0 3h18M7 14h3",
  calculator: "M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zm2 4h8M8 11h2m4 0h2M8 15h2m4 0h2",
  inbox: "M3 13h5l1.5 3h5l1.5-3h5M5 5h14l2 8v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6l2-8z",
  bell: "M15 17H9m6 0h4l-1.4-1.4A2 2 0 0117 14.2V11a5 5 0 00-10 0v3.2a2 2 0 01-.6 1.4L5 17h4m6 0a3 3 0 01-6 0",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1l2-1.6-2-3.4-2.4 1a7.6 7.6 0 00-1.7-1L14.8 3H9.2l-.4 2.6a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 001.7 1l.4 2.6h5.6l.4-2.6a7.6 7.6 0 001.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z",
  flag: "M5 21V4m0 0h12l-2 4 2 4H5",
  key: "M15 7a4 4 0 11-8 0 4 4 0 018 0zm-4 4l-7 7 2 2m1-5l2 2",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  wrench: "M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4L15 12l-3-3 2.7-2.7z",
  logout: "M15 17l5-5-5-5m5 5H9m0-9H6a2 2 0 00-2 2v14a2 2 0 002 2h3",
  sun: "M12 3v2m0 14v2M4.2 4.2l1.4 1.4m12.8 12.8l1.4 1.4M3 12h2m14 0h2M4.2 19.8l1.4-1.4m12.8-12.8l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z",
  moon: "M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z",
  plus: "M12 5v14M5 12h14",
  chevron: "M9 6l6 6-6 6",
  x: "M6 6l12 12M18 6L6 18",
  external: "M14 4h6v6m0-6L10 14M20 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1h5",
  video: "M4 6h11a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm12 4l5-3v10l-5-3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z",
  trash: "M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3",
  up: "M12 19V5m0 0l-6 6m6-6l6 6",
  down: "M12 5v14m0 0l6-6m-6 6l-6-6",
  archive: "M3 7h18v3H3V7zm1 3v10h16V10M10 14h4",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18",
  refresh: "M20 11A8 8 0 006.3 6.3L4 8m0 0V3m0 5h5m-5 5a8 8 0 0013.7 4.7L20 16m0 0v5m0-5h-5",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17z",
};

export function Icon({ name, className = "w-[18px] h-[18px]" }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg className={`${className} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={PATHS[name] ?? PATHS.list} />
    </svg>
  );
}

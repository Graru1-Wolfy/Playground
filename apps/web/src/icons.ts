/** Inline SVG icons (16×16, currentColor). */

export type IconName =
  | "compute"
  | "ceiling"
  | "wall"
  | "teleport"
  | "slope"
  | "prefs"
  | "close";

const ICONS: Record<IconName, string> = {
  compute: `<path d="M4 4h8v8H4V4z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M7 7l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  ceiling: `<path d="M3 5h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2"/>`,
  wall: `<path d="M4 4v8M8 4v8M12 4v8M4 4h8M4 8h8M4 12h8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>`,
  teleport: `<circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 5v6M5.5 7.5L8 5l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  slope: `<path d="M3 12L13 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  prefs: `<path d="M3 5h10M3 8h10M3 11h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  close: `<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
};

export function iconSvg(name: IconName, className = "icon"): string {
  return `<svg class="${className}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${ICONS[name]}</svg>`;
}

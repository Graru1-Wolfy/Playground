export interface BounceContext {
  teleheight: number;
  /** When set, Ceilingsmash uses this gap instead of floor height. */
  ceilingGap: number | null;
}

const STORAGE_TELE = "bounce-teleheight";
const STORAGE_CEILING = "bounce-ceiling-gap";
const STORAGE_CEILING_ON = "bounce-ceiling-on";

export const TELEHEIGHT_MIN = 0;
export const TELEHEIGHT_MAX = 2;
export const TELEHEIGHT_STEP = 0.03125;
export const CEILING_GAP_MIN = 63;
export const CEILING_GAP_MAX = 200;

export function loadBounceContext(): BounceContext {
  const teleRaw = localStorage.getItem(STORAGE_TELE);
  const teleheight = teleRaw !== null ? clampTele(Number(teleRaw)) : 1;
  const ceilingOn = localStorage.getItem(STORAGE_CEILING_ON) === "1";
  const ceilRaw = localStorage.getItem(STORAGE_CEILING);
  const ceilingGap = ceilingOn ? clampCeiling(ceilRaw !== null ? Number(ceilRaw) : 82) : null;
  return { teleheight, ceilingGap };
}

export function saveBounceContext(ctx: BounceContext): void {
  localStorage.setItem(STORAGE_TELE, String(ctx.teleheight));
  localStorage.setItem(STORAGE_CEILING_ON, ctx.ceilingGap !== null ? "1" : "0");
  if (ctx.ceilingGap !== null) {
    localStorage.setItem(STORAGE_CEILING, String(ctx.ceilingGap));
  }
}

export function clampTele(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const stepped = Math.round(value / TELEHEIGHT_STEP) * TELEHEIGHT_STEP;
  return Math.min(TELEHEIGHT_MAX, Math.max(TELEHEIGHT_MIN, stepped));
}

export function clampCeiling(value: number): number {
  if (!Number.isFinite(value)) return CEILING_GAP_MIN;
  return Math.min(CEILING_GAP_MAX, Math.max(CEILING_GAP_MIN, Math.floor(value)));
}

export function formatTeleheight(value: number): string {
  return value.toFixed(5).replace(/\.?0+$/, "") || "0";
}

import { formatTeleheight, type BounceContext } from "./bounceEnv.js";
import { el } from "./ui.js";

export function formatEnvCompactSummary(height: number, ctx: BounceContext): string {
  const parts = [`${height} ft`];
  parts.push(ctx.ceilingGap !== null ? `ceil ${ctx.ceilingGap}` : "ceil off");
  parts.push(`tele ${formatTeleheight(ctx.teleheight)}`);
  return parts.join(" · ");
}

export function syncEnvCompactSummary(height: number, ctx: BounceContext): void {
  el<HTMLElement>("env-compact-summary").textContent = formatEnvCompactSummary(height, ctx);
}

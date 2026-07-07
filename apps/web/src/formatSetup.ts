import type { DecodedSetup } from "@playground/schema";

const LAUNCHERS = ["Stock", "Original", "Mangler"];

export function launcherName(code: number, numRockets: number): string {
  if (numRockets === 0) return "Any";
  return LAUNCHERS[code] ?? `Launcher ${code}`;
}

function flagSummary(flag: number): string[] {
  const tags: string[] = [];
  if (flag & 1) tags.push("bounce");
  if (flag & 2) tags.push("auto");
  if (flag & 4) tags.push("full-auto↓");
  if (flag & 8) tags.push("stand-auto");
  if (flag & 16) tags.push("sync");
  if (flag & 32) tags.push("sync-auto");
  return tags;
}

export function formatSetupSummary(setup: DecodedSetup, score: number): string {
  const launcher = launcherName(setup.launcher, setup.num_rockets);
  const rockets = setup.num_rockets;
  const speeds = setup.speeds.filter((s) => Number.isFinite(s)).map((s) => `${s.toFixed(0)} u/s`);
  const bounceTags = flagSummary(setup.bounce_flag);
  const standTags = flagSummary(setup.standing_bounce_flag);
  const parts = [
    `<strong>${launcher}</strong>`,
    `${rockets} rocket${rockets === 1 ? "" : "s"}`,
    speeds.length ? `speeds: ${speeds.join(", ")}` : null,
    bounceTags.length ? `bounce: ${bounceTags.join(", ")}` : null,
    standTags.length ? `standing: ${standTags.join(", ")}` : null,
    `score ${Math.round(score)}`,
    `id ${setup.ID.toString()}`,
  ].filter(Boolean);
  return parts.join(" · ");
}

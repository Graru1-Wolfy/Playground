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

function tagClass(tag: string): string {
  if (tag === "bounce") return "setup-tag setup-tag--bounce";
  return "setup-tag";
}

export function formatSetupCard(setup: DecodedSetup, score: number, rank: number): string {
  const launcher = launcherName(setup.launcher, setup.num_rockets);
  const rockets = setup.num_rockets;
  const speeds = setup.speeds.filter((s) => Number.isFinite(s)).map((s) => `${s.toFixed(0)} u/s`);
  const bounceTags = flagSummary(setup.bounce_flag);
  const standTags = flagSummary(setup.standing_bounce_flag);

  const tags: string[] = [];
  for (const tag of bounceTags) {
    tags.push(`<span class="${tagClass(tag)}">${tag}</span>`);
  }
  for (const tag of standTags) {
    tags.push(`<span class="${tagClass(tag)}">standing: ${tag}</span>`);
  }
  for (const speed of speeds) {
    tags.push(`<span class="setup-tag setup-tag--speed">${speed}</span>`);
  }

  return [
    `<article class="setup-card" role="listitem">`,
    `<span class="setup-rank">${rank}</span>`,
    `<div class="setup-main">`,
    `<div class="setup-title">`,
    `<span class="setup-launcher">${launcher}</span>`,
    `<span class="setup-rockets">${rockets} rocket${rockets === 1 ? "" : "s"}</span>`,
    `</div>`,
    tags.length ? `<div class="setup-meta">${tags.join("")}</div>` : "",
    `<span class="setup-id">#${setup.ID.toString()}</span>`,
    `</div>`,
    `<div class="setup-score">`,
    `<span class="setup-score-value">${Math.round(score)}</span>`,
    `<span class="setup-score-label">score</span>`,
    `</div>`,
    `</article>`,
  ].join("");
}

/** @deprecated Use formatSetupCard — kept for compatibility */
export function formatSetupSummary(setup: DecodedSetup, score: number): string {
  return formatSetupCard(setup, score, 0);
}

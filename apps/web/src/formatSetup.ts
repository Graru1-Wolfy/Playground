import type { DecodedSetup } from "@playground/schema";
import { getSetupTags, resolveSetupPatterns } from "@playground/schema";
import { escapeHtml } from "./ui.js";

const LAUNCHERS = ["Stock", "Original", "Mangler"] as const;

const LAUNCHER_COLORS: Record<string, string> = {
  Stock: "launcher-stock",
  Original: "launcher-orig",
  Mangler: "launcher-mang",
  Any: "launcher-any",
};

export function launcherName(code: number, numRockets: number): string {
  if (numRockets === 0) return "Any";
  return LAUNCHERS[code] ?? `Launcher ${code}`;
}

export function launcherClass(code: number, numRockets: number): string {
  return LAUNCHER_COLORS[launcherName(code, numRockets)] ?? "launcher-any";
}

function renderTags(tags: { label: string; tone: string }[]): string {
  if (!tags.length) return "";
  return tags.map((t) => `<span class="tag ${t.tone}">${escapeHtml(t.label)}</span>`).join("");
}

export interface SetupCardOptions {
  rank: number;
  score: number;
  maxScore: number;
}

export function formatSetupCard(setup: DecodedSetup, options: SetupCardOptions): string {
  const launcher = launcherName(setup.launcher, setup.num_rockets);
  const pillClass = launcherClass(setup.launcher, setup.num_rockets);
  const rockets = setup.num_rockets;
  const speeds = setup.speeds.filter((s) => Number.isFinite(s)).sort((a, b) => b - a);
  const speedMarkup =
    speeds.length > 0
      ? `<span class="setup-meta mono setup-speeds" title="Rocket speeds max → min (u/s)">${speeds
          .map((s, index) =>
            index === 0
              ? `<span>${s.toFixed(0)}</span>`
              : `<span class="speed-fall" aria-hidden="true">↓</span><span>${s.toFixed(0)}</span>`,
          )
          .join("")}<span class="setup-speed-unit"> u/s</span></span>`
      : "";
  const tags = getSetupTags(setup);
  const patterns = resolveSetupPatterns(setup);
  const scorePct = options.maxScore > 0 ? Math.round((options.score / options.maxScore) * 100) : 0;
  const idStr = setup.ID.toString();

  const metaParts = [
    patterns
      ? `<span class="setup-pattern hint" title="${escapeHtml(`${patterns.movementDetail} · ${patterns.actionDetail}`)}">${escapeHtml(patterns.movementLabel)} · ${escapeHtml(patterns.actionLabel)}</span>`
      : "",
    speedMarkup,
    tags.length ? `<span class="setup-tags">${renderTags(tags)}</span>` : "",
  ].filter(Boolean);

  return `
    <article
      class="setup-card setup-card-interactive"
      data-setup-id="${escapeHtml(idStr)}"
      role="button"
      tabindex="0"
      aria-label="Setup rank ${options.rank}, ${escapeHtml(launcher)}, score ${Math.round(options.score)}"
    >
      <span class="setup-rank" data-rank="${options.rank}" aria-label="Rank ${options.rank}">#${options.rank}</span>
      <span class="launcher-pill ${pillClass}">${escapeHtml(launcher)}</span>
      <span class="setup-rockets">${rockets}r</span>
      <div class="setup-meta-wrap">${metaParts.join("")}</div>
      <div class="setup-score-wrap">
        <span class="setup-score mono">${Math.round(options.score)}</span>
        <div class="score-bar" role="presentation"><div class="score-bar-fill" style="width: ${scorePct}%"></div></div>
      </div>
      <span class="setup-id mono" title="${escapeHtml(idStr)}">${escapeHtml(idStr.slice(0, 8))}…</span>
      <span class="setup-card-chevron" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <button type="button" class="btn btn-ghost btn-sm copy-id-btn" data-copy="${escapeHtml(idStr)}" aria-label="Copy setup ID">⧉</button>
    </article>`;
}

/** @deprecated Use formatSetupCard */
export function formatSetupSummary(setup: DecodedSetup, score: number): string {
  return formatSetupCard(setup, { rank: 0, score, maxScore: score || 1 });
}

export function setupMatchesFilter(setup: DecodedSetup, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const launcher = launcherName(setup.launcher, setup.num_rockets).toLowerCase();
  const tagLabels = getSetupTags(setup, 20).map((t) => t.label);
  const haystack = [
    launcher,
    String(setup.num_rockets),
    setup.ID.toString(),
    ...tagLabels,
    ...setup.speeds.map((s) => String(Math.round(s))),
  ].join(" ");
  return haystack.toLowerCase().includes(q);
}

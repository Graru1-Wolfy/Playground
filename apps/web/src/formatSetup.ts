import type { DecodedSetup } from "@playground/schema";
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

function flagSummary(flag: number): { label: string; tone: string }[] {
  const tags: { label: string; tone: string }[] = [];
  if (flag & 1) tags.push({ label: "bounce", tone: "tag-bounce" });
  if (flag & 2) tags.push({ label: "auto", tone: "tag-auto" });
  if (flag & 4) tags.push({ label: "full-auto↓", tone: "tag-fullauto" });
  if (flag & 8) tags.push({ label: "stand-auto", tone: "tag-stand" });
  if (flag & 16) tags.push({ label: "sync", tone: "tag-sync" });
  if (flag & 32) tags.push({ label: "sync-auto", tone: "tag-sync" });
  return tags;
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
  const launcherClass = LAUNCHER_COLORS[launcher] ?? "launcher-any";
  const rockets = setup.num_rockets;
  const speeds = setup.speeds.filter((s) => Number.isFinite(s)).map((s) => `${s.toFixed(0)}`);
  const bounceTags = flagSummary(setup.bounce_flag);
  const standTags = flagSummary(setup.standing_bounce_flag);
  const scorePct = options.maxScore > 0 ? Math.round((options.score / options.maxScore) * 100) : 0;
  const idStr = setup.ID.toString();

  const speedHtml = speeds.length
    ? `<div class="setup-stat">
        <span class="setup-stat-label">Speeds</span>
        <span class="setup-stat-value mono">${speeds.map((s) => `${s} u/s`).join(", ")}</span>
      </div>`
    : "";

  const bounceHtml = bounceTags.length
    ? `<div class="setup-tags-row"><span class="setup-tags-label">Bounce</span>${renderTags(bounceTags)}</div>`
    : "";
  const standHtml = standTags.length
    ? `<div class="setup-tags-row"><span class="setup-tags-label">Standing</span>${renderTags(standTags)}</div>`
    : "";

  return `
    <article class="setup-card" data-setup-id="${escapeHtml(idStr)}">
      <div class="setup-rank" aria-label="Rank ${options.rank}">#${options.rank}</div>
      <div class="setup-main">
        <header class="setup-head">
          <div class="setup-title">
            <span class="launcher-pill ${launcherClass}">${escapeHtml(launcher)}</span>
            <span class="setup-rockets">${rockets} rocket${rockets === 1 ? "" : "s"}</span>
          </div>
          <div class="setup-score-wrap">
            <span class="setup-score mono">${Math.round(options.score)}</span>
            <div class="score-bar" role="presentation">
              <div class="score-bar-fill" style="width: ${scorePct}%"></div>
            </div>
          </div>
        </header>
        <div class="setup-body">
          ${speedHtml}
          ${bounceHtml}
          ${standHtml}
        </div>
        <footer class="setup-foot">
          <span class="setup-id mono">id ${escapeHtml(idStr)}</span>
          <button type="button" class="btn btn-ghost btn-sm copy-id-btn" data-copy="${escapeHtml(idStr)}">Copy ID</button>
        </footer>
      </div>
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
  const bounceTags = flagSummary(setup.bounce_flag).map((t) => t.label);
  const standTags = flagSummary(setup.standing_bounce_flag).map((t) => t.label);
  const haystack = [
    launcher,
    String(setup.num_rockets),
    setup.ID.toString(),
    ...bounceTags,
    ...standTags,
    ...setup.speeds.map((s) => String(Math.round(s))),
  ].join(" ");
  return haystack.toLowerCase().includes(q);
}

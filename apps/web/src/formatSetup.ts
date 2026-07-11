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

function renderFlagPills(setup: DecodedSetup): string {
  const flags = [
    ["Moving", setup.start_moving],
    ["Action", setup.start_action],
    ["Fired crouch", setup.rocket_fired_crouched_flag],
    ["Hit crouch", setup.rocket_hit_crouched_flag],
  ];

  return flags
    .map(([label, value]) => {
      const enabled = Number(value) > 0;
      return `<span class="detail-pill ${enabled ? "detail-pill-on" : ""}">${escapeHtml(String(label))}: ${enabled ? "yes" : "no"}</span>`;
    })
    .join("");
}

function renderDelayStats(setup: DecodedSetup): string {
  const rows = [
    ["Auto bounce", setup.tick_delay_auto_bounce],
    ["Synced auto", setup.tick_delay_auto_synced_bounce],
    ["Standing auto", setup.tick_delay_auto_standing_bounce],
    ["Standing synced", setup.tick_delay_auto_synced_standing_bounce],
  ];

  return rows
    .map(([label, value]) => `<span><strong>${escapeHtml(String(value))}</strong>${escapeHtml(String(label))}</span>`)
    .join("");
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
  const allTags = [...flagSummary(setup.bounce_flag), ...flagSummary(setup.standing_bounce_flag)];
  const scorePct = options.maxScore > 0 ? Math.round((options.score / options.maxScore) * 100) : 0;
  const idStr = setup.ID.toString();

  const metaParts = [
    speeds.length ? `<span class="setup-meta mono">${speeds.join("/")} u/s</span>` : "",
    allTags.length ? `<span class="setup-tags">${renderTags(allTags)}</span>` : "",
  ].filter(Boolean);

  return `
    <article class="setup-card" data-setup-id="${escapeHtml(idStr)}">
      <div class="setup-card-row">
        <span class="setup-rank" aria-label="Rank ${options.rank}">#${options.rank}</span>
        <span class="launcher-pill ${launcherClass}">${escapeHtml(launcher)}</span>
        <span class="setup-rockets">${rockets}r</span>
        <div class="setup-meta-wrap">${metaParts.join("")}</div>
        <div class="setup-score-wrap">
          <span class="setup-score mono">${Math.round(options.score)}</span>
          <div class="score-bar" role="presentation"><div class="score-bar-fill" style="width: ${scorePct}%"></div></div>
        </div>
        <span class="setup-id mono" title="${escapeHtml(idStr)}">${escapeHtml(idStr.slice(0, 8))}…</span>
        <button type="button" class="btn btn-ghost btn-sm copy-id-btn" data-copy="${escapeHtml(idStr)}" aria-label="Copy setup ID">⧉</button>
      </div>
      <details class="setup-details">
        <summary>View setup details</summary>
        <div class="setup-detail-panel">
          <div class="setup-detail-hero">
            <div>
              <span class="detail-label">Setup ID</span>
              <strong class="mono">${escapeHtml(idStr)}</strong>
            </div>
            <button type="button" class="btn btn-ghost btn-compact copy-id-btn" data-copy="${escapeHtml(idStr)}">Copy setup ID</button>
          </div>
          <div class="setup-detail-grid">
            <div class="detail-card">
              <span class="detail-label">Launcher</span>
              <strong>${escapeHtml(launcher)} · ${rockets} rocket${rockets === 1 ? "" : "s"}</strong>
            </div>
            <div class="detail-card">
              <span class="detail-label">Speeds</span>
              <strong class="mono">${escapeHtml(speeds.length ? `${speeds.join(" / ")} u/s` : "none")}</strong>
            </div>
            <div class="detail-card detail-card-wide">
              <span class="detail-label">Bounce tags</span>
              <div class="setup-tags setup-tags-detail">${renderTags(allTags) || '<span class="hint">No flags</span>'}</div>
            </div>
            <div class="detail-card detail-card-wide">
              <span class="detail-label">State flags</span>
              <div class="detail-pill-row">${renderFlagPills(setup)}</div>
            </div>
            <div class="detail-card detail-card-wide">
              <span class="detail-label">Tick delays</span>
              <div class="detail-stat-row">${renderDelayStats(setup)}</div>
            </div>
          </div>
        </div>
      </details>
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

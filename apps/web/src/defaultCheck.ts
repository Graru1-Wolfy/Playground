import {
  runDefaultChecks,
  type BounceCheckOptions,
  type DefaultCheckRow,
  DEFAULT_START_GUIDES,
  formatGuideBindBlock,
  type DefaultStartGuide,
} from "@playground/schema";
import { escapeHtml } from "./ui.js";

export type { BounceCheckOptions, DefaultCheckRow };
export { runDefaultChecks } from "@playground/schema";

const GUIDE_BY_LABEL = new Map(DEFAULT_START_GUIDES.map((guide) => [guide.label, guide]));

export interface DefaultReliability {
  hits: number;
  total: number;
  percent: number;
}

export function defaultSetupId(label: string): string {
  return `default:${label}`;
}

export function isDefaultSetupId(id: string): boolean {
  return id.startsWith("default:");
}

export function computeDefaultReliability(row: DefaultCheckRow): DefaultReliability {
  const hits = [row.uncrouched, row.crouched, row.jumpbug].filter((code) => code > 0).length;
  return {
    hits,
    total: 3,
    percent: Math.round((hits / 3) * 100),
  };
}

function bounceBadgeCompact(code: number, label: string): string {
  const title = code === 0 ? "No bounce" : code === 1 ? "Bounce" : code === 2 ? "Double bounce" : `Code ${code}`;
  if (code === 0) return `<span class="bounce-badge bounce-none" title="${title} — ${label}">—</span>`;
  if (code === 1) return `<span class="bounce-badge bounce-yes" title="${title} — ${label}">B</span>`;
  if (code === 2) return `<span class="bounce-badge bounce-double" title="${title} — ${label}">2×</span>`;
  return `<span class="bounce-badge bounce-other" title="${title} — ${label}">${code}</span>`;
}

function landingOutcomeLabel(code: number): string {
  if (code === 0) return "No bounce";
  if (code === 1) return "Bounce";
  if (code === 2) return "Double bounce";
  return `Code ${code}`;
}

export function formatDefaultSetupCard(row: DefaultCheckRow, rank: number): string {
  const reliability = computeDefaultReliability(row);
  const guide = GUIDE_BY_LABEL.get(row.label);
  const id = defaultSetupId(row.label);
  const stepPreview = escapeHtml(guide?.instructions[0] ?? "Analytical DEFAULT start");

  return `
    <details class="setup-card setup-card-collapsible setup-card-default" data-setup-id="${escapeHtml(id)}">
      <summary class="setup-card-summary">
        <span class="setup-rank" data-rank="${rank}" aria-label="Rank ${rank}">#${rank}</span>
        <span class="launcher-pill launcher-default">DEFAULT</span>
        <span class="setup-rockets setup-default-label">${escapeHtml(row.label)}</span>
        <div class="setup-meta-wrap">
          <span class="setup-default-steps hint">${stepPreview}</span>
          <span class="setup-default-landings" aria-label="Landing outcomes">
            ${bounceBadgeCompact(row.uncrouched, "Uncrouched")}
            ${bounceBadgeCompact(row.crouched, "Crouched")}
            ${bounceBadgeCompact(row.jumpbug, "Jumpbug")}
          </span>
        </div>
        <div class="setup-score-wrap">
          <span class="setup-score mono setup-reliability-score">${reliability.percent}%</span>
          <div class="score-bar setup-reliability-bar" role="presentation">
            <div class="score-bar-fill score-bar-reliability" style="width: ${reliability.percent}%"></div>
          </div>
        </div>
        <span class="setup-id mono setup-default-kind">Analytical</span>
        <span class="setup-card-chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </summary>
      <div class="setup-card-expand setup-detail-dense" data-setup-expand></div>
    </details>`;
}

export interface DefaultDetailContext {
  rank: number;
  height: number;
  teleheight: number;
  ceilingGap: number | null;
}

export function formatDefaultDetailHtml(row: DefaultCheckRow, context: DefaultDetailContext): string {
  const guide = GUIDE_BY_LABEL.get(row.label);
  const reliability = computeDefaultReliability(row);
  const bindText = guide ? formatGuideBindBlock(guide) : "";
  const steps = guide?.instructions ?? [`Execute ${row.label} at height ${context.height}.`];

  const landingRows = [
    { label: "Uncrouched", code: row.uncrouched },
    { label: "Crouched", code: row.crouched },
    { label: "Jumpbug", code: row.jumpbug },
  ];

  const contextParts = [`Height ${context.height} ft`];
  if (context.teleheight !== 1) contextParts.push(`tele ${context.teleheight}`);
  if (context.ceilingGap !== null) contextParts.push(`ceiling ${context.ceilingGap} ft`);

  const stepMarkup = steps.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const landingMarkup = landingRows
    .map(
      (landing) => `
      <div class="setup-detail-row">
        <span class="setup-detail-label">${escapeHtml(landing.label)}</span>
        <span class="setup-detail-value">${bounceBadgeCompact(landing.code, landing.label)} <span class="hint">${escapeHtml(landingOutcomeLabel(landing.code))}</span></span>
      </div>`,
    )
    .join("");

  return `
    <div class="setup-detail-summary">
      <div class="setup-detail-headline">
        <span class="setup-detail-rank">#${context.rank}</span>
        <span class="launcher-pill launcher-default">DEFAULT</span>
        <span class="setup-detail-rockets">${escapeHtml(row.label)}</span>
      </div>
      <p class="hint setup-detail-context">${escapeHtml(contextParts.join(" · "))}</p>
      <div class="setup-detail-reliability-block">
        <span class="setup-detail-label">Landing reliability</span>
        <div class="setup-detail-reliability-head">
          <span class="setup-detail-score mono setup-reliability-score">${reliability.percent}%</span>
          <span class="setup-detail-score-meta">${reliability.hits}/${reliability.total} landing types bounce</span>
        </div>
        <div class="score-bar setup-detail-score-bar" role="presentation">
          <div class="score-bar-fill score-bar-reliability" style="width: ${reliability.percent}%"></div>
        </div>
      </div>
    </div>
    <section class="setup-detail-section setup-detail-section-prominent">
      <h3>Execution steps</h3>
      <ol class="setup-instruction-list">${stepMarkup}</ol>
    </section>
    <section class="setup-detail-section">
      <h3>Landing outcomes</h3>
      <div class="setup-detail-rows">${landingMarkup}</div>
    </section>
    <section class="setup-detail-section setup-detail-section-script setup-detail-section-prominent">
      <div class="setup-detail-section-head">
        <h3>Config script</h3>
        <button type="button" class="btn btn-ghost btn-sm setup-copy-binds" data-copy-text="${escapeHtml(bindText)}">Copy script</button>
      </div>
      <pre class="setup-bind-block mono">${escapeHtml(bindText)}</pre>
      <p class="hint setup-bind-hint">Example: <span class="mono">bind shift +walk</span> · <span class="mono">bind mouse1 +strike</span></p>
    </section>`;
}

export function getDefaultGuide(label: string): DefaultStartGuide | undefined {
  return GUIDE_BY_LABEL.get(label);
}

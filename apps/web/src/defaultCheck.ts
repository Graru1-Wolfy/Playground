import {
  checkBounce,
  LandType,
  type BounceInput,
} from "@playground/engine-fast";
import { DEFAULT_START_GUIDES, formatGuideBindBlock } from "@playground/schema";
import { escapeHtml } from "./ui.js";

const DEFAULT_TYPES: { label: string; bounce: BounceInput }[] = [
  { label: "Walk", bounce: { vel: -6, text: "Walk" } },
  { label: "Crouch Walk", bounce: { vel: -6, crouched: true, text: "Crouch Walk" } },
  { label: "Jump", bounce: { vel: 283, text: "Jump" } },
  { label: "Crouch Jump", bounce: { vel: 289, text: "Crouch Jump" } },
  { label: "Ctap", bounce: { vel: 289, crouched: true, text: "Ctap" } },
  { label: "Ceilingsmash", bounce: { vel: -6, ceiling: true, text: "Ceilingsmash" } },
];

const GUIDE_BY_LABEL = new Map(DEFAULT_START_GUIDES.map((guide) => [guide.label, guide]));

export interface DefaultCheckRow {
  label: string;
  uncrouched: number;
  crouched: number;
  jumpbug: number;
}

export interface BounceCheckOptions {
  teleheight?: number;
  ceilingGap?: number | null;
}

export function runDefaultChecks(height: number, options: BounceCheckOptions = {}): DefaultCheckRow[] {
  const teleheight = options.teleheight ?? 1;
  const ceilingGap = options.ceilingGap ?? null;

  return DEFAULT_TYPES.map(({ label, bounce }) => {
    const checkHeight =
      bounce.ceiling && ceilingGap !== null ? ceilingGap : height;
    return {
      label,
      uncrouched: checkBounce(checkHeight, bounce, LandType.UNCROUCHED, teleheight),
      crouched: checkBounce(checkHeight, bounce, LandType.CROUCHED, teleheight),
      jumpbug: checkBounce(checkHeight, bounce, LandType.JUMPBUG, teleheight),
    };
  });
}

function bounceBadgeCompact(code: number, label: string): string {
  const title = code === 0 ? "No bounce" : code === 1 ? "Bounce" : code === 2 ? "Double bounce" : `Code ${code}`;
  if (code === 0) return `<span class="bounce-badge bounce-none" title="${title} — ${label}">—</span>`;
  if (code === 1) return `<span class="bounce-badge bounce-yes" title="${title} — ${label}">B</span>`;
  if (code === 2) return `<span class="bounce-badge bounce-double" title="${title} — ${label}">2×</span>`;
  return `<span class="bounce-badge bounce-other" title="${title} — ${label}">${code}</span>`;
}

function renderStartCell(label: string): string {
  const guide = GUIDE_BY_LABEL.get(label);
  if (!guide) {
    return `<span class="default-label">${escapeHtml(label)}</span>`;
  }
  const hint = escapeHtml(guide.instructions[0] ?? "");
  return `<span class="default-label">${escapeHtml(label)}</span><span class="default-guide hint">${hint}</span>`;
}

export function formatDefaultGrid(rows: DefaultCheckRow[]): string {
  const head = `<thead><tr>
    <th scope="col">Start</th>
    <th scope="col"><span class="default-col-full">Uncrouched</span><span class="default-col-short">Unc</span></th>
    <th scope="col"><span class="default-col-full">Crouched</span><span class="default-col-short">Cro</span></th>
    <th scope="col"><span class="default-col-full">Jumpbug</span><span class="default-col-short">JB</span></th>
  </tr></thead>`;
  const body = rows
    .map((row) => {
      const hasBounce =
        row.uncrouched > 0 || row.crouched > 0 || row.jumpbug > 0;
      return `<tr class="${hasBounce ? "default-row-active" : ""}">
        <th scope="row">${renderStartCell(row.label)}</th>
        <td>${bounceBadgeCompact(row.uncrouched, "Uncrouched")}</td>
        <td>${bounceBadgeCompact(row.crouched, "Crouched")}</td>
        <td>${bounceBadgeCompact(row.jumpbug, "Jumpbug")}</td>
      </tr>`;
    })
    .join("");

  const guideBlocks = DEFAULT_START_GUIDES.map((guide) => {
    const bindText = formatGuideBindBlock(guide);
    const instructionList = guide.instructions.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    return `
      <article class="default-guide-card">
        <h3>${escapeHtml(guide.label)}</h3>
        <pre class="setup-bind-block mono">${escapeHtml(bindText)}</pre>
        <ol class="setup-instruction-list setup-instruction-list-compact">${instructionList}</ol>
      </article>`;
  }).join("");

  return `
    <table class="default-table"><caption class="sr-only">DEFAULT bounce results by start type and landing</caption>${head}<tbody>${body}</tbody></table>
    <details class="default-binds-panel">
      <summary>Start binds &amp; instructions</summary>
      <div class="default-guide-grid">${guideBlocks}</div>
    </details>`;
}

/** @deprecated Use formatDefaultGrid */
export function formatDefaultTable(rows: DefaultCheckRow[]): string {
  return formatDefaultGrid(rows);
}

import type { DecodedSetup } from "@playground/schema";
import {
  formatBindBlock,
  generateSetupBinds,
  generateSetupInstructions,
  getSetupTags,
  preferencesConfig,
  resolveSetupPatterns,
} from "@playground/schema";
import type { DefaultCheckRow, DefaultDetailContext } from "./defaultCheck.js";
import { defaultSetupId, formatDefaultDetailHtml, isDefaultSetupId } from "./defaultCheck.js";
import { launcherClass, launcherName } from "./formatSetup.js";
import { copyToClipboard, el, escapeHtml } from "./ui.js";

export interface SetupDetailContext {
  rank: number;
  score: number;
  maxScore: number;
}

export type SetupLookupEntry =
  | { kind: "sim"; setup: DecodedSetup; context: SetupDetailContext }
  | { kind: "default"; row: DefaultCheckRow; context: DefaultDetailContext };

interface DetailRow {
  label: string;
  value: string;
}

interface DetailSection {
  title: string;
  rows: DetailRow[];
  tags: { label: string; tone: string }[];
}

function setupReliabilityPercent(setup: DecodedSetup): number | null {
  const consist = setup.CONSIST;
  if (consist === undefined || consist < 0) return null;
  return Math.round((consist / 255) * 100);
}

function renderTags(tags: { label: string; tone: string }[]): string {
  if (!tags.length) return `<p class="hint setup-detail-empty">None</p>`;
  return tags
    .map((t) => `<span class="tag ${escapeHtml(t.tone)}">${escapeHtml(t.label)}</span>`)
    .join("");
}

function renderRows(rows: DetailRow[]): string {
  if (!rows.length) return "";
  return rows
    .map(
      (row) => `
      <div class="setup-detail-row">
        <span class="setup-detail-label">${escapeHtml(row.label)}</span>
        <span class="setup-detail-value mono">${escapeHtml(row.value)}</span>
      </div>`,
    )
    .join("");
}

function preferenceSections(setup: DecodedSetup): DetailSection[] {
  const tagged = getSetupTags(setup, 999);
  const tagById = new Map(tagged.map((tag) => [tag.id, tag]));
  const sections: DetailSection[] = [];

  for (const group of preferencesConfig.groups) {
    if (group.name === "Launcher") continue;

    if (group.name === "Trajectory") {
      sections.push({
        title: group.name,
        rows: group.preferences.map((pref) => ({
          label: pref.label,
          value: String(setup[pref.id as keyof DecodedSetup] ?? 0),
        })),
        tags: [],
      });
      continue;
    }

    const tags = group.preferences
      .map((pref) => tagById.get(pref.id))
      .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined)
      .map((tag) => ({ label: `${tag.label} (${tag.value})`, tone: tag.tone }));

    if (!tags.length) continue;
    sections.push({ title: group.name, rows: [], tags });
  }

  return sections;
}

function engineSection(setup: DecodedSetup): DetailSection {
  const speeds = setup.speeds.filter((s) => Number.isFinite(s));
  return {
    title: "Engine record",
    rows: [
      { label: "Setup ID", value: setup.ID.toString() },
      { label: "Launcher code", value: String(setup.launcher) },
      { label: "Rockets", value: String(setup.num_rockets) },
      { label: "Tick delay auto bounce", value: String(setup.tick_delay_auto_bounce) },
      { label: "Tick delay auto synced bounce", value: String(setup.tick_delay_auto_synced_bounce) },
      { label: "Tick delay auto standing bounce", value: String(setup.tick_delay_auto_standing_bounce) },
      {
        label: "Tick delay auto synced standing bounce",
        value: String(setup.tick_delay_auto_synced_standing_bounce),
      },
      { label: "Bounce flag", value: String(setup.bounce_flag) },
      { label: "Standing bounce flag", value: String(setup.standing_bounce_flag) },
      { label: "Rocket fired crouched flag", value: String(setup.rocket_fired_crouched_flag) },
      { label: "Rocket hit crouched flag", value: String(setup.rocket_hit_crouched_flag) },
      {
        label: "Speeds (u/s)",
        value: speeds.length ? speeds.map((s) => s.toFixed(2)).join(" → ") : "—",
      },
    ],
    tags: [],
  };
}

function renderPatternSection(setup: DecodedSetup): string {
  const patterns = resolveSetupPatterns(setup);
  if (!patterns) return "";

  return `
    <section class="setup-detail-section setup-detail-section-prominent">
      <h3>Start pattern</h3>
      <div class="setup-pattern-cards">
        <article class="setup-pattern-card">
          <span class="setup-pattern-kind">Movement</span>
          <strong class="setup-pattern-label">${escapeHtml(patterns.movementLabel)}</strong>
          <p class="hint setup-pattern-detail">${escapeHtml(patterns.movementDetail)}</p>
        </article>
        <article class="setup-pattern-card">
          <span class="setup-pattern-kind">Start action</span>
          <strong class="setup-pattern-label">${escapeHtml(patterns.actionLabel)}</strong>
          <p class="hint setup-pattern-detail">${escapeHtml(patterns.actionDetail)}</p>
        </article>
      </div>
    </section>`;
}

function renderScriptSection(binds: ReturnType<typeof generateSetupBinds>): string {
  if (!binds) return "";

  const bindBlock = formatBindBlock(binds);
  return `
    <section class="setup-detail-section setup-detail-section-script setup-detail-section-prominent">
      <div class="setup-detail-section-head">
        <h3>Config script</h3>
        <button type="button" class="btn btn-ghost btn-sm setup-copy-binds" data-copy-text="${escapeHtml(bindBlock)}">Copy script</button>
      </div>
      <pre class="setup-bind-block mono">${escapeHtml(bindBlock)}</pre>
      <p class="hint setup-bind-hint">Example: <span class="mono">bind shift +walk</span> · <span class="mono">bind mouse1 +strike</span></p>
    </section>`;
}

function renderReliabilityBlock(percent: number, meta: string): string {
  return `
    <div class="setup-detail-reliability-block">
      <span class="setup-detail-label">Consistency reliability</span>
      <div class="setup-detail-reliability-head">
        <span class="setup-detail-score mono setup-reliability-score">${percent}%</span>
        <span class="setup-detail-score-meta">${escapeHtml(meta)}</span>
      </div>
      <div class="score-bar setup-detail-score-bar" role="presentation">
        <div class="score-bar-fill score-bar-reliability" style="width: ${percent}%"></div>
      </div>
    </div>`;
}

export function formatSetupDetailHtml(setup: DecodedSetup, context: SetupDetailContext): string {
  const launcher = launcherName(setup.launcher, setup.num_rockets);
  const pillClass = launcherClass(setup.launcher, setup.num_rockets);
  const scorePct = context.maxScore > 0 ? Math.round((context.score / context.maxScore) * 100) : 0;
  const speeds = setup.speeds.filter((s) => Number.isFinite(s)).sort((a, b) => b - a);
  const speedMarkup =
    speeds.length > 0
      ? speeds
          .map((s, index) =>
            index === 0
              ? `<span>${s.toFixed(0)}</span>`
              : `<span class="speed-fall" aria-hidden="true">↓</span><span>${s.toFixed(0)}</span>`,
          )
          .join("") + `<span class="setup-speed-unit"> u/s</span>`
      : `<span class="hint">—</span>`;

  const sections = [...preferenceSections(setup), engineSection(setup)];
  const binds = generateSetupBinds(setup);
  const instructions = generateSetupInstructions(setup);
  const reliability = setupReliabilityPercent(setup);
  const patternSection = renderPatternSection(setup);

  const instructionMarkup = instructions
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");

  const sectionMarkup = sections
    .map((section) => {
      return `
        <section class="setup-detail-section">
          <h3>${escapeHtml(section.title)}</h3>
          ${section.rows.length ? `<div class="setup-detail-rows">${renderRows(section.rows)}</div>` : ""}
          ${section.tags.length ? `<div class="setup-detail-tags">${renderTags(section.tags)}</div>` : ""}
        </section>`;
    })
    .join("");

  const reliabilityMarkup =
    reliability !== null
      ? renderReliabilityBlock(reliability, `CONSIST ${setup.CONSIST ?? 0}/255`)
      : "";

  return `
    <div class="setup-detail-summary">
      <div class="setup-detail-headline">
        <span class="setup-detail-rank">#${context.rank}</span>
        <span class="launcher-pill ${pillClass}">${escapeHtml(launcher)}</span>
        <span class="setup-detail-rockets mono">${setup.num_rockets} rockets</span>
      </div>
      <div class="setup-detail-score-block">
        <span class="setup-detail-score mono">${Math.round(context.score)}</span>
        <span class="setup-detail-score-meta">score · ${scorePct}% of top</span>
        <div class="score-bar setup-detail-score-bar" role="presentation">
          <div class="score-bar-fill" style="width: ${scorePct}%"></div>
        </div>
      </div>
      ${reliabilityMarkup}
      <div class="setup-detail-speeds">
        <span class="setup-detail-label">Speeds</span>
        <span class="setup-meta mono setup-speeds">${speedMarkup}</span>
      </div>
    </div>
    ${patternSection}
    <section class="setup-detail-section setup-detail-section-prominent">
      <h3>Execution steps</h3>
      <ol class="setup-instruction-list">${instructionMarkup}</ol>
    </section>
    ${sectionMarkup}
    ${renderScriptSection(binds)}`;
}

let openSetupId: string | null = null;

function bindCopyScriptButtons(container: HTMLElement): void {
  for (const btn of container.querySelectorAll<HTMLButtonElement>(".setup-copy-binds")) {
    btn.addEventListener("click", async (event) => {
      event.stopPropagation();
      const text = btn.dataset.copyText ?? "";
      const ok = await copyToClipboard(text);
      const original = btn.textContent;
      btn.textContent = ok ? "Copied!" : "Failed";
      setTimeout(() => {
        btn.textContent = original;
      }, 1500);
    });
  }
}

export function openSetupDetail(entry: SetupLookupEntry): void {
  const modal = el<HTMLElement>("setup-modal");
  const body = el<HTMLDivElement>("setup-modal-body");
  const title = el<HTMLHeadingElement>("setup-modal-title");
  const copyBtn = el<HTMLButtonElement>("setup-modal-copy");

  if (entry.kind === "default") {
    openSetupId = defaultSetupId(entry.row.label);
    title.textContent = `${entry.row.label} (DEFAULT)`;
    body.innerHTML = formatDefaultDetailHtml(entry.row, entry.context);
    copyBtn.classList.add("hidden");
  } else {
    openSetupId = entry.setup.ID.toString();
    title.textContent = `Setup #${entry.context.rank}`;
    body.innerHTML = formatSetupDetailHtml(entry.setup, entry.context);
    copyBtn.classList.remove("hidden");
  }

  bindCopyScriptButtons(body);

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("setup-modal-open");

  el<HTMLButtonElement>("setup-modal-close").focus();
}

export function closeSetupDetail(): void {
  const modal = el<HTMLElement>("setup-modal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("setup-modal-open");
  openSetupId = null;
}

export function bindSetupDetailModal(): void {
  el<HTMLButtonElement>("setup-modal-close").addEventListener("click", closeSetupDetail);
  el<HTMLDivElement>("setup-modal-backdrop").addEventListener("click", closeSetupDetail);
  el<HTMLButtonElement>("setup-modal-copy").addEventListener("click", async () => {
    if (!openSetupId || isDefaultSetupId(openSetupId)) return;
    const btn = el<HTMLButtonElement>("setup-modal-copy");
    const ok = await copyToClipboard(openSetupId);
    const original = btn.textContent;
    btn.textContent = ok ? "Copied!" : "Failed";
    setTimeout(() => {
      btn.textContent = original;
    }, 1500);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openSetupId !== null) {
      closeSetupDetail();
    }
  });
}

export function bindSetupCards(
  container: HTMLElement,
  lookup: Map<string, SetupLookupEntry>,
): void {
  for (const card of container.querySelectorAll<HTMLElement>(".setup-card")) {
    const id = card.dataset.setupId;
    if (!id) continue;

    const open = (): void => {
      const entry = lookup.get(id);
      if (entry) openSetupDetail(entry);
    };

    card.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest(".copy-id-btn")) return;
      open();
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open();
    });
  }
}

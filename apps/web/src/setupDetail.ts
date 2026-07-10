import type { DecodedSetup } from "@playground/schema";
import { getSetupTags, preferencesConfig } from "@playground/schema";
import { launcherClass, launcherName } from "./formatSetup.js";
import { copyToClipboard, el, escapeHtml } from "./ui.js";

export interface SetupDetailContext {
  rank: number;
  score: number;
  maxScore: number;
}

interface DetailRow {
  label: string;
  value: string;
}

interface DetailSection {
  title: string;
  rows: DetailRow[];
  tags: { label: string; tone: string }[];
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
      { label: "Start moving", value: String(setup.start_moving) },
      { label: "Start action", value: String(setup.start_action) },
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
      <div class="setup-detail-speeds">
        <span class="setup-detail-label">Speeds</span>
        <span class="setup-meta mono setup-speeds">${speedMarkup}</span>
      </div>
    </div>
    ${sectionMarkup}`;
}

let openSetupId: string | null = null;

export function openSetupDetail(setup: DecodedSetup, context: SetupDetailContext): void {
  const modal = el<HTMLElement>("setup-modal");
  const body = el<HTMLDivElement>("setup-modal-body");
  const title = el<HTMLHeadingElement>("setup-modal-title");

  openSetupId = setup.ID.toString();
  title.textContent = `Setup #${context.rank}`;
  body.innerHTML = formatSetupDetailHtml(setup, context);

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
    if (!openSetupId) return;
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
  lookup: Map<string, { setup: DecodedSetup; context: SetupDetailContext }>,
): void {
  for (const card of container.querySelectorAll<HTMLElement>(".setup-card")) {
    const id = card.dataset.setupId;
    if (!id) continue;

    const open = (): void => {
      const entry = lookup.get(id);
      if (entry) openSetupDetail(entry.setup, entry.context);
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

import { formatDefaultTable, runDefaultChecks } from "./defaultCheck.js";
import { formatSetupCard } from "./formatSetup.js";
import { normalizeHeight } from "./height.js";
import { loadSetupsForHeight } from "./lookup.js";
import {
  getActivePreset,
  getPresetById,
  presetConfigs,
  resolvePresetWeights,
  setActivePresetId,
  type PresetConfig,
} from "./presets.js";
import {
  loadWeights,
  preferencesConfig,
  resetWeights,
  saveWeight,
  saveWeights,
  scoreSetup,
} from "./preferences.js";

import type { DecodedSetup } from "@playground/schema";

const CUSTOM_PRESET_ID = "custom";

let currentSetups: DecodedSetup[] = [];
let maxDisplayed = 20;

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

function setLoading(loading: boolean): void {
  el<HTMLDivElement>("app").classList.toggle("loading", loading);
}

function updateStats(height: number, setupCount: number, topScore: number | null): void {
  const bucket = Math.floor(height / 100);
  el<HTMLSpanElement>("stat-height-value").textContent = String(height);
  el<HTMLSpanElement>("stat-setups-value").textContent = String(setupCount);
  el<HTMLSpanElement>("stat-best-value").textContent =
    topScore !== null ? String(Math.round(topScore)) : "—";
  el<HTMLSpanElement>("stat-bucket-value").textContent =
    bucket <= 0 ? `000–099` : `${String(bucket * 100).padStart(3, "0")}+`;
}

function openDrawer(): void {
  const drawer = el<HTMLElement>("prefs-drawer");
  const backdrop = el<HTMLElement>("drawer-backdrop");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  requestAnimationFrame(() => backdrop.classList.add("visible"));
}

function closeDrawer(): void {
  const drawer = el<HTMLElement>("prefs-drawer");
  const backdrop = el<HTMLElement>("drawer-backdrop");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  backdrop.classList.remove("visible");
  setTimeout(() => {
    backdrop.hidden = true;
  }, 220);
}

function toggleSidebar(): void {
  el<HTMLElement>("app").querySelector(".sidebar")?.classList.toggle("open");
}

function applyPreset(preset: PresetConfig): void {
  saveWeights(resolvePresetWeights(preset));
  setActivePresetId(preset.id);
  renderPresetControls();
  renderPreferences();
  void rerankAndDisplay();
}

function markCustomPreset(): void {
  setActivePresetId(null);
  renderPresetControls();
}

function renderPresetGrid(): void {
  const grid = el<HTMLDivElement>("preset-grid");
  grid.innerHTML = "";
  const active = getActivePreset();

  for (const preset of presetConfigs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-card";
    button.role = "listitem";
    button.dataset.presetId = preset.id;
    button.setAttribute("aria-pressed", String(active?.id === preset.id));
    if (active?.id === preset.id) {
      button.classList.add("active");
    }

    button.innerHTML = [
      `<span class="preset-card-name">${preset.name}</span>`,
      `<span class="preset-card-desc">${preset.description}</span>`,
    ].join("");

    button.addEventListener("click", () => applyPreset(preset));
    grid.appendChild(button);
  }
}

function renderPresetSelect(): void {
  const select = el<HTMLSelectElement>("preset-select");
  const active = getActivePreset();
  const currentValue = active?.id ?? CUSTOM_PRESET_ID;

  select.innerHTML = "";
  for (const preset of presetConfigs) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    select.appendChild(option);
  }

  const customOption = document.createElement("option");
  customOption.value = CUSTOM_PRESET_ID;
  customOption.textContent = "Custom";
  select.appendChild(customOption);

  select.value = presetConfigs.some((preset) => preset.id === currentValue)
    ? currentValue
    : CUSTOM_PRESET_ID;
}

function renderPresetControls(): void {
  renderPresetGrid();
  renderPresetSelect();
}

function renderPreferences(): void {
  const panel = el<HTMLDivElement>("preferences-panel");
  panel.innerHTML = "";
  const weights = loadWeights();

  for (const group of preferencesConfig.groups) {
    const section = document.createElement("section");
    section.className = "pref-group";
    const title = document.createElement("h3");
    title.textContent = group.name;
    section.appendChild(title);

    for (const pref of group.preferences) {
      const row = document.createElement("label");
      row.className = "pref-row";
      const name = document.createElement("span");
      name.textContent = pref.label;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "-1000";
      input.max = "255";
      input.step = "1";
      input.value = String(weights[pref.id] ?? pref.defaultWeight);
      input.addEventListener("change", () => {
        saveWeight(pref.id, Number(input.value));
        markCustomPreset();
        void rerankAndDisplay();
      });
      row.append(name, input);
      section.appendChild(row);
    }
    panel.appendChild(section);
  }
}

function presetLabel(): string {
  const active = getActivePreset();
  return active?.name ?? "Custom";
}

async function rerankAndDisplay(): Promise<void> {
  const weights = loadWeights();
  const scored = [...currentSetups]
    .map((setup) => ({ setup, score: scoreSetup(setup, weights) }))
    .sort((a, b) => b.score - a.score);

  const list = el<HTMLDivElement>("setup-results");
  list.innerHTML = "";
  const limit = maxDisplayed;
  scored.slice(0, limit).forEach((item, index) => {
    list.insertAdjacentHTML("beforeend", formatSetupCard(item.setup, item.score, index + 1));
  });

  const status = el<HTMLParagraphElement>("setup-status");
  const presetName = presetLabel();
  const baseStatus =
    currentSetups.length === 0
      ? "No precomputed file for this height (bucket 0–99 only in MVP)."
      : `Showing ${Math.min(limit, scored.length)} of ${scored.length} setups`;
  status.textContent = `${baseStatus} · Preset: ${presetName}`;

  updateStats(
    Number(el<HTMLInputElement>("height-input").value),
    currentSetups.length,
    scored.length > 0 ? scored[0].score : null,
  );
}

async function runCheck(): Promise<void> {
  setLoading(true);
  try {
    const raw = Number(el<HTMLInputElement>("height-input").value);
    const height = normalizeHeight(raw);
    const note = el<HTMLParagraphElement>("height-note");
    note.textContent =
      raw !== height ? `Terminal velocity remap: ${raw} → ${height}` : `Lookup height: ${height}`;

    const defaultRows = runDefaultChecks(height);
    el<HTMLDivElement>("default-results").innerHTML = formatDefaultTable(defaultRows);

    currentSetups = await loadSetupsForHeight(height);
    await rerankAndDisplay();
  } finally {
    setLoading(false);
  }
}

function bindDrawerControls(): void {
  for (const id of ["prefs-toggle", "prefs-nav"]) {
    el<HTMLButtonElement>(id).addEventListener("click", openDrawer);
  }
  el<HTMLButtonElement>("drawer-close").addEventListener("click", closeDrawer);
  el<HTMLElement>("drawer-backdrop").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
}

function bindNavigation(): void {
  el<HTMLButtonElement>("menu-toggle").addEventListener("click", toggleSidebar);

  for (const link of document.querySelectorAll<HTMLAnchorElement>(".nav-item[data-section]")) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      if (section) {
        document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
        for (const item of document.querySelectorAll(".nav-item")) {
          item.classList.toggle("active", item === link);
        }
      }
      el<HTMLElement>("app").querySelector(".sidebar")?.classList.remove("open");
    });
  }
}

function bindPresetControls(): void {
  el<HTMLSelectElement>("preset-select").addEventListener("change", (e) => {
    const value = (e.target as HTMLSelectElement).value;
    if (value === CUSTOM_PRESET_ID) return;
    const preset = getPresetById(value);
    if (preset) applyPreset(preset);
  });
}

export function initApp(): void {
  renderPresetControls();
  renderPreferences();
  bindDrawerControls();
  bindNavigation();
  bindPresetControls();

  el<HTMLButtonElement>("check-btn").addEventListener("click", () => void runCheck());
  el<HTMLInputElement>("height-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") void runCheck();
  });
  el<HTMLSelectElement>("page-size").addEventListener("change", (e) => {
    maxDisplayed = Number((e.target as HTMLSelectElement).value);
    void rerankAndDisplay();
  });
  el<HTMLButtonElement>("reset-prefs").addEventListener("click", () => {
    resetWeights();
    const balanced = getPresetById("balanced");
    if (balanced) {
      setActivePresetId("balanced");
    }
    renderPresetControls();
    renderPreferences();
    void rerankAndDisplay();
  });
  void runCheck();
}

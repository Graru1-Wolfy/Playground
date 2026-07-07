import { formatDefaultTable, runDefaultChecks } from "./defaultCheck.js";
import { formatSetupSummary } from "./formatSetup.js";
import { normalizeHeight } from "./height.js";
import { loadSetupsForHeight } from "./lookup.js";
import {
  loadWeights,
  preferencesConfig,
  resetWeights,
  saveWeight,
  scoreSetup,
} from "./preferences.js";

import type { DecodedSetup } from "@playground/schema";

let currentSetups: DecodedSetup[] = [];
let maxDisplayed = 20;

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
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
        void rerankAndDisplay();
      });
      row.append(name, input);
      section.appendChild(row);
    }
    panel.appendChild(section);
  }
}

async function rerankAndDisplay(): Promise<void> {
  const weights = loadWeights();
  const scored = [...currentSetups]
    .map((setup) => ({ setup, score: scoreSetup(setup, weights) }))
    .sort((a, b) => b.score - a.score);

  const list = el<HTMLOListElement>("setup-results");
  list.innerHTML = "";
  const limit = maxDisplayed;
  for (const item of scored.slice(0, limit)) {
    const li = document.createElement("li");
    li.innerHTML = formatSetupSummary(item.setup, item.score);
    list.appendChild(li);
  }

  const status = el<HTMLParagraphElement>("setup-status");
  status.textContent =
    currentSetups.length === 0
      ? "No precomputed file for this height (bucket 0–99 only in MVP)."
      : `Showing ${Math.min(limit, scored.length)} of ${scored.length} setups`;
}

async function runCheck(): Promise<void> {
  const raw = Number(el<HTMLInputElement>("height-input").value);
  const height = normalizeHeight(raw);
  const note = el<HTMLParagraphElement>("height-note");
  note.textContent =
    raw !== height ? `Terminal velocity remap: ${raw} → ${height}` : `Lookup height: ${height}`;

  el<HTMLDivElement>("default-results").innerHTML = formatDefaultTable(runDefaultChecks(height));

  currentSetups = await loadSetupsForHeight(height);
  await rerankAndDisplay();
}

export function initApp(): void {
  renderPreferences();
  el<HTMLButtonElement>("check-btn").addEventListener("click", () => void runCheck());
  el<HTMLSelectElement>("page-size").addEventListener("change", (e) => {
    maxDisplayed = Number((e.target as HTMLSelectElement).value);
    void rerankAndDisplay();
  });
  el<HTMLButtonElement>("reset-prefs").addEventListener("click", () => {
    resetWeights();
    renderPreferences();
    void rerankAndDisplay();
  });
  void runCheck();
}

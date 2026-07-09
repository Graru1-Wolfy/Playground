import { formatDefaultGrid, runDefaultChecks } from "./defaultCheck.js";
import { formatSetupCard, setupMatchesFilter } from "./formatSetup.js";
import { normalizeHeight } from "./height.js";
import { loadSetupsWithSource } from "./lookup.js";
import {
  loadWeights,
  preferencesConfig,
  resetWeights,
  saveWeight,
  scoreSetup,
} from "./preferences.js";
import { formatSlopeWallGrid, runSlopeWallChecks } from "./slopeWallCheck.js";
import { slopeWallSummary } from "./slopeWall.js";
import { copyToClipboard, debounce, el, setLiveStatus, showElement } from "./ui.js";

import type { DecodedSetup } from "@playground/schema";

let currentSetups: DecodedSetup[] = [];
let setupDataSource: "generated" | "sample" | "none" = "none";
let maxDisplayed = 20;
let filterQuery = "";
let checkGeneration = 0;

function syncHeightControls(height: number): void {
  const input = el<HTMLInputElement>("height-input");
  const slider = el<HTMLInputElement>("height-slider");
  const display = el<HTMLSpanElement>("height-display");

  input.value = String(height);
  display.textContent = String(height);

  const sliderMax = Number(slider.max);
  if (height <= sliderMax) {
    slider.value = String(height);
  } else {
    slider.value = String(sliderMax);
  }

  for (const chip of document.querySelectorAll<HTMLButtonElement>(".chip[data-height]")) {
    chip.classList.toggle("chip-active", Number(chip.dataset.height) === height);
  }
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
      const row = document.createElement("div");
      row.className = "pref-row";

      const labelWrap = document.createElement("label");
      labelWrap.className = "pref-label";
      labelWrap.htmlFor = `pref-${pref.id}`;

      const name = document.createElement("span");
      name.className = "pref-name";
      name.textContent = pref.label;

      const desc = document.createElement("span");
      desc.className = "pref-desc";
      desc.textContent = pref.description;

      labelWrap.append(name, desc);

      const inputWrap = document.createElement("div");
      inputWrap.className = "pref-input-wrap";

      const input = document.createElement("input");
      input.id = `pref-${pref.id}`;
      input.type = "range";
      input.min = "-1000";
      input.max = "255";
      input.step = "1";
      input.value = String(weights[pref.id] ?? pref.defaultWeight);
      input.className = "pref-slider";

      const value = document.createElement("output");
      value.className = "pref-value mono";
      value.htmlFor = input.id;
      value.textContent = input.value;

      input.addEventListener("input", () => {
        value.textContent = input.value;
        saveWeight(pref.id, Number(input.value));
        void rerankAndDisplay();
      });

      inputWrap.append(input, value);
      row.append(labelWrap, inputWrap);
      section.appendChild(row);
    }
    panel.appendChild(section);
  }
}

async function rerankAndDisplay(): Promise<void> {
  const weights = loadWeights();
  const scored = [...currentSetups]
    .map((setup) => ({ setup, score: scoreSetup(setup, weights) }))
    .filter(({ setup }) => setupMatchesFilter(setup, filterQuery))
    .sort((a, b) => b.score - a.score);

  const maxScore = scored.length > 0 ? scored[0]!.score : 1;
  const list = el<HTMLOListElement>("setup-results");
  list.innerHTML = "";

  const limit = maxDisplayed;
  const slice = scored.slice(0, limit);
  slice.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = formatSetupCard(item.setup, {
      rank: index + 1,
      score: item.score,
      maxScore,
    });
    list.appendChild(li);
  });

  bindCopyButtons(list);

  const status = el<HTMLParagraphElement>("setup-status");
  const total = currentSetups.length;
  const filtered = scored.length;

  if (total === 0) {
    status.textContent = "No precomputed data for this height";
    showElement(el<HTMLDivElement>("setup-empty"), true);
    showElement(el<HTMLDivElement>("setup-loading"), false);
    showElement(el<HTMLDivElement>("setup-list-header"), false);
  } else {
    showElement(el<HTMLDivElement>("setup-empty"), false);
    showElement(el<HTMLDivElement>("setup-list-header"), true);
    const filterNote = filterQuery.trim() ? ` · ${filtered} match` : "";
    const sourceNote =
      setupDataSource === "sample" ? " · sample data" : setupDataSource === "generated" ? "" : "";
    status.textContent = `${Math.min(limit, filtered)}/${filtered}${filterNote} · ${total} setups${sourceNote}`;
  }
}

function bindCopyButtons(container: HTMLElement): void {
  for (const btn of container.querySelectorAll<HTMLButtonElement>(".copy-id-btn")) {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.copy ?? "";
      const ok = await copyToClipboard(id);
      const original = btn.textContent;
      btn.textContent = ok ? "Copied!" : "Failed";
      btn.classList.toggle("copy-success", ok);
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("copy-success");
      }, 1500);
    });
  }
}

function renderSlopeWallChecks(height: number): void {
  const slopeDeg = Number(el<HTMLInputElement>("slope-slider").value);
  const hasWall = el<HTMLInputElement>("wall-toggle").checked;
  el<HTMLOutputElement>("slope-display").textContent = `${slopeDeg}°`;

  const note = el<HTMLParagraphElement>("slope-wall-note");
  const results = el<HTMLDivElement>("slope-wall-results");

  if (slopeDeg <= 0 && !hasWall) {
    note.textContent = "Flat ground — use Instant DEFAULT";
    results.innerHTML = `<p class="hint slope-wall-empty">Set ground slope or enable wall for angled bounce intervals.</p>`;
    return;
  }

  const input = { verticalHeight: height, slopeDeg, hasWall };
  const { effective, rows } = runSlopeWallChecks(input);
  note.textContent = slopeWallSummary(input, effective);
  results.innerHTML = formatSlopeWallGrid(rows);
}

async function runCheck(): Promise<void> {
  const generation = ++checkGeneration;
  setLiveStatus("loading");
  showElement(el<HTMLDivElement>("setup-loading"), true);
  showElement(el<HTMLDivElement>("setup-empty"), false);

  const raw = Number(el<HTMLInputElement>("height-input").value);
  let height: number;
  try {
    height = normalizeHeight(raw);
  } catch {
    setLiveStatus("error");
    showElement(el<HTMLDivElement>("setup-loading"), false);
    el<HTMLParagraphElement>("height-note").textContent = "Enter a valid non-negative height.";
    return;
  }

  syncHeightControls(height);

  const note = el<HTMLParagraphElement>("height-note");
  note.textContent =
    raw !== height
      ? `Terminal velocity remap: ${raw} → ${height}`
      : `Lookup height: ${height} · bucket ${Math.floor(height / 100) * 100}–${Math.floor(height / 100) * 100 + 99}`;

  el<HTMLDivElement>("default-results").innerHTML = formatDefaultGrid(runDefaultChecks(height));

  renderSlopeWallChecks(height);

  const { setups, source } = await loadSetupsWithSource(height);
  if (generation !== checkGeneration) return;

  currentSetups = setups;
  setupDataSource = source;

  showElement(el<HTMLDivElement>("setup-loading"), false);
  await rerankAndDisplay();
  setLiveStatus("ready");
}

function openPrefs(): void {
  const drawer = el<HTMLElement>("prefs-drawer");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  el<HTMLButtonElement>("prefs-toggle").setAttribute("aria-expanded", "true");
  document.body.classList.add("prefs-open");
}

function closePrefs(): void {
  const drawer = el<HTMLElement>("prefs-drawer");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  el<HTMLButtonElement>("prefs-toggle").setAttribute("aria-expanded", "false");
  document.body.classList.remove("prefs-open");
}

const debouncedCheck = debounce(() => void runCheck(), 280);

export function initApp(): void {
  renderPreferences();

  const heightInput = el<HTMLInputElement>("height-input");
  const heightSlider = el<HTMLInputElement>("height-slider");

  el<HTMLButtonElement>("check-btn").addEventListener("click", () => void runCheck());

  heightInput.addEventListener("input", () => {
    debouncedCheck();
  });

  heightInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void runCheck();
  });

  heightSlider.addEventListener("input", () => {
    heightInput.value = heightSlider.value;
    debouncedCheck();
  });

  for (const chip of document.querySelectorAll<HTMLButtonElement>(".chip[data-height]")) {
    chip.addEventListener("click", () => {
      heightInput.value = chip.dataset.height ?? "64";
      void runCheck();
    });
  }

  el<HTMLInputElement>("slope-slider").addEventListener("input", () => {
    renderSlopeWallChecks(Number(heightInput.value));
  });

  el<HTMLInputElement>("wall-toggle").addEventListener("change", () => {
    renderSlopeWallChecks(Number(heightInput.value));
  });

  el<HTMLSelectElement>("page-size").addEventListener("change", (e) => {
    maxDisplayed = Number((e.target as HTMLSelectElement).value);
    void rerankAndDisplay();
  });

  el<HTMLInputElement>("setup-filter").addEventListener("input", (e) => {
    filterQuery = (e.target as HTMLInputElement).value;
    void rerankAndDisplay();
  });

  el<HTMLButtonElement>("reset-prefs").addEventListener("click", () => {
    resetWeights();
    renderPreferences();
    void rerankAndDisplay();
  });

  el<HTMLButtonElement>("prefs-toggle").addEventListener("click", openPrefs);
  el<HTMLButtonElement>("prefs-close").addEventListener("click", closePrefs);
  el<HTMLDivElement>("prefs-backdrop").addEventListener("click", closePrefs);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePrefs();
  });

  void runCheck();
}

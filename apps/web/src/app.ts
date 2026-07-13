import { bindBounceEnvControls, readBounceContextFromDom } from "./bounceEnvUi.js";
import { formatDefaultGrid, runDefaultChecks } from "./defaultCheck.js";
import { formatSetupCard, setupMatchesFilter } from "./formatSetup.js";
import { HAMMER_SLIDER_STEP, MAX_HAMMER_HEIGHT, normalizeHeight, snapHammerSlider } from "./height.js";
import { loadSetupsWithSource } from "./lookup.js";
import {
  loadWeights,
  preferencesConfig,
  resetWeights,
  saveWeight,
  scoreSetup,
} from "./preferences.js";
import { renderSurfaceDiagram } from "./surfaceDiagram.js";
import { formatSlopeWallGrid, runSlopeWallChecks } from "./slopeWallCheck.js";
import { slopeWallSummary } from "./slopeWall.js";
import { copyToClipboard, debounce, el, setLiveStatus, showElement } from "./ui.js";

import type { DecodedSetup } from "@playground/schema";

let currentSetups: DecodedSetup[] = [];
let setupDataSource: "generated" | "sample" | "none" = "none";
let maxDisplayed = 20;
let filterQuery = "";
let checkGeneration = 0;
let liveCompute = true;

const LIVE_COMPUTE_STORAGE = "bounce-live-compute";

function syncHeightControls(targetHeight: number): void {
  const input = el<HTMLInputElement>("height-input");
  const slider = el<HTMLInputElement>("height-slider");
  const display = el<HTMLSpanElement>("height-display");

  input.value = String(targetHeight);
  display.textContent = String(targetHeight);

  const sliderMax = Number(slider.max);
  if (targetHeight <= sliderMax) {
    slider.value = String(snapHammerSlider(targetHeight));
  } else {
    slider.value = String(sliderMax);
  }

  for (const chip of document.querySelectorAll<HTMLButtonElement>(".chip[data-height]")) {
    chip.classList.toggle("chip-active", Number(chip.dataset.height) === targetHeight);
  }
}

function previewHeightControls(rawHeight: number): void {
  if (!Number.isFinite(rawHeight)) return;
  const targetHeight = Math.min(MAX_HAMMER_HEIGHT, Math.max(0, Math.floor(rawHeight)));
  el<HTMLSpanElement>("height-display").textContent = String(targetHeight);
  el<HTMLInputElement>("height-slider").value = String(snapHammerSlider(targetHeight));
  for (const chip of document.querySelectorAll<HTMLButtonElement>(".chip[data-height]")) {
    chip.classList.toggle("chip-active", Number(chip.dataset.height) === targetHeight);
  }
}

function rankedSetupGenerationCallout(height: number): string {
  const command = `npm run generate:ranked-setups -- ${height}`;
  if (window.bounceNative?.canGenerateRankedSetups) {
    return `No ranked simulation setups for ${height} HU. <span class="hint">Generate this height inside the desktop app.</span>
      <span class="empty-command-row">
        <button type="button" class="empty-state-link empty-state-action" data-generate-height="${height}">Generate in app</button>
      </span>`;
  }
  return `No ranked simulation setups for ${height} HU. <span class="hint">APK/browser builds cannot run the Python generator locally. Generate this height on a machine, then publish the archive.</span>
    <span class="empty-command-row">
      <code class="empty-state-code">${command}</code>
      <button type="button" class="empty-state-link empty-state-action" data-copy-command="${command}">Copy npm command</button>
    </span>`;
}

function loadLiveCompute(): boolean {
  return localStorage.getItem(LIVE_COMPUTE_STORAGE) !== "0";
}

function saveLiveCompute(enabled: boolean): void {
  localStorage.setItem(LIVE_COMPUTE_STORAGE, enabled ? "1" : "0");
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
  bindSetupCardToggles(list);

  const status = el<HTMLParagraphElement>("setup-status");
  const total = currentSetups.length;
  const filtered = scored.length;

  if (total === 0) {
    status.textContent = "No precomputed data for this height";
    el<HTMLParagraphElement>("setup-empty-message").innerHTML =
      rankedSetupGenerationCallout(Number(el<HTMLInputElement>("height-input").value));
    showElement(el<HTMLDivElement>("setup-empty"), true);
    showElement(el<HTMLDivElement>("setup-loading"), false);
    showElement(el<HTMLDivElement>("setup-list-header"), false);
  } else if (filtered === 0) {
    status.textContent = `0/${total} setups match`;
    el<HTMLParagraphElement>("setup-empty-message").textContent =
      `No setups match "${filterQuery.trim()}". Try another launcher, tag, speed, or setup ID.`;
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
    btn.addEventListener("click", async (event) => {
      event.stopPropagation();
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

function bindSetupCardToggles(container: HTMLElement): void {
  const interactiveSelector = "button, a, input, select, textarea, summary";

  for (const card of container.querySelectorAll<HTMLElement>(".setup-card")) {
    const details = card.querySelector<HTMLDetailsElement>(".setup-details");
    if (!details) continue;

    const syncExpanded = () => {
      card.setAttribute("aria-expanded", String(details.open));
    };
    const toggle = () => {
      details.open = !details.open;
      syncExpanded();
    };
    syncExpanded();
    details.addEventListener("toggle", syncExpanded);

    card.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest(interactiveSelector)) return;
      toggle();
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if ((event.target as HTMLElement).closest(interactiveSelector)) return;
      event.preventDefault();
      toggle();
    });
  }
}

function renderSlopeWallChecks(height: number, ctx = readBounceContextFromDom()): void {
  const slopeDeg = Number(el<HTMLInputElement>("slope-slider").value);
  const hasWall = el<HTMLInputElement>("wall-toggle").checked;
  el<HTMLOutputElement>("slope-display").textContent = `${slopeDeg}°`;

  const note = el<HTMLParagraphElement>("slope-wall-note");
  const results = el<HTMLDivElement>("slope-wall-results");
  const diagram = el<HTMLDivElement>("surface-diagram");

  const input = {
    verticalHeight: height,
    slopeDeg,
    hasWall,
    ceilingGap: ctx.ceilingGap,
    teleheight: ctx.teleheight,
  };
  diagram.innerHTML = renderSurfaceDiagram(input);

  if (slopeDeg <= 0 && !hasWall) {
    note.textContent = "Flat ground — use Instant DEFAULT";
    results.innerHTML = `<p class="hint slope-wall-empty">Set ground slope or enable wall for angled bounce intervals.</p>`;
    return;
  }

  const { effective, rows } = runSlopeWallChecks(input, ctx.teleheight);
  note.textContent = slopeWallSummary(input, effective);
  results.innerHTML = formatSlopeWallGrid(rows, effective === null);
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
    el<HTMLParagraphElement>("height-note").textContent = `Enter a height from 0 to ${MAX_HAMMER_HEIGHT} HU.`;
    return;
  }

  const targetHeight = Math.floor(raw);
  syncHeightControls(targetHeight);

  const ctx = readBounceContextFromDom();

  const note = el<HTMLParagraphElement>("height-note");
  const envParts: string[] = [];
  if (ctx.teleheight !== 1) envParts.push(`tele ${ctx.teleheight}`);
  if (ctx.ceilingGap !== null) envParts.push(`ceil ${ctx.ceilingGap}`);
  const envNote = envParts.length ? ` · ${envParts.join(" · ")}` : "";
  note.textContent =
    targetHeight !== height
      ? `Target: ${targetHeight} HU · lookup remap: ${height} HU${envNote}`
      : `Lookup height: ${height} HU · bucket ${Math.floor(height / 100) * 100}–${Math.floor(height / 100) * 100 + 99}${envNote}`;

  el<HTMLDivElement>("default-results").innerHTML = formatDefaultGrid(runDefaultChecks(height, {
    teleheight: ctx.teleheight,
    ceilingGap: ctx.ceilingGap,
  }));

  renderSlopeWallChecks(height, ctx);

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

function requestCompute(): void {
  if (liveCompute) {
    debouncedCheck();
  } else {
    setLiveStatus("pending");
  }
}

function setLiveCompute(enabled: boolean): void {
  liveCompute = enabled;
  saveLiveCompute(enabled);
  el<HTMLInputElement>("live-compute-toggle").checked = enabled;
  if (enabled) {
    void runCheck();
  } else {
    setLiveStatus("pending");
  }
}

function setTargetHeightFromControl(value: number, snap: boolean): void {
  const height = snap ? snapHammerSlider(value) : Math.min(MAX_HAMMER_HEIGHT, Math.max(0, Math.floor(value)));
  el<HTMLInputElement>("height-input").value = String(height);
  syncHeightControls(height);
  requestCompute();
}

export function initApp(): void {
  renderPreferences();

  const heightInput = el<HTMLInputElement>("height-input");
  const heightSlider = el<HTMLInputElement>("height-slider");
  liveCompute = loadLiveCompute();
  el<HTMLInputElement>("live-compute-toggle").checked = liveCompute;
  heightInput.max = String(MAX_HAMMER_HEIGHT);
  heightSlider.max = String(MAX_HAMMER_HEIGHT);
  heightSlider.step = String(HAMMER_SLIDER_STEP);

  el<HTMLButtonElement>("check-btn").addEventListener("click", () => void runCheck());
  el<HTMLInputElement>("live-compute-toggle").addEventListener("change", (e) => {
    setLiveCompute((e.target as HTMLInputElement).checked);
  });

  heightInput.addEventListener("input", () => {
    previewHeightControls(Number(heightInput.value));
    requestCompute();
  });

  heightInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void runCheck();
  });

  heightSlider.addEventListener("input", () => {
    const snapped = snapHammerSlider(Number(heightSlider.value));
    setTargetHeightFromControl(snapped, true);
  });

  for (const chip of document.querySelectorAll<HTMLButtonElement>(".chip[data-height]")) {
    chip.addEventListener("click", () => {
      heightInput.value = chip.dataset.height ?? "64";
      void runCheck();
    });
  }

  for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-height-nudge]")) {
    btn.addEventListener("click", () => {
      const delta = Number(btn.dataset.heightNudge ?? "0");
      const current = Number(heightInput.value);
      setTargetHeightFromControl(current + delta, true);
    });
  }

  el<HTMLInputElement>("slope-slider").addEventListener("input", () => {
    renderSlopeWallChecks(Number(heightInput.value));
  });

  el<HTMLInputElement>("wall-toggle").addEventListener("change", () => {
    renderSlopeWallChecks(Number(heightInput.value));
  });

  bindBounceEnvControls(() => {
    requestCompute();
  });

  el<HTMLSelectElement>("page-size").addEventListener("change", (e) => {
    maxDisplayed = Number((e.target as HTMLSelectElement).value);
    void rerankAndDisplay();
  });

  el<HTMLInputElement>("setup-filter").addEventListener("input", (e) => {
    filterQuery = (e.target as HTMLInputElement).value;
    el<HTMLButtonElement>("clear-filter").disabled = filterQuery.trim().length === 0;
    void rerankAndDisplay();
  });

  el<HTMLButtonElement>("clear-filter").addEventListener("click", () => {
    const input = el<HTMLInputElement>("setup-filter");
    input.value = "";
    filterQuery = "";
    el<HTMLButtonElement>("clear-filter").disabled = true;
    input.focus();
    void rerankAndDisplay();
  });

  el<HTMLDivElement>("setup-empty").addEventListener("click", async (event) => {
    const commandButton = (event.target as HTMLElement).closest("[data-copy-command]") as HTMLButtonElement | null;
    if (commandButton) {
      const command = commandButton.dataset.copyCommand ?? "";
      const original = commandButton.textContent;
      const ok = await copyToClipboard(command);
      commandButton.textContent = ok ? "Copied command" : "Copy failed";
      commandButton.classList.toggle("copy-success", ok);
      setTimeout(() => {
        commandButton.textContent = original;
        commandButton.classList.remove("copy-success");
      }, 1500);
      return;
    }

    const generateButton = (event.target as HTMLElement).closest("[data-generate-height]") as HTMLButtonElement | null;
    if (!generateButton || !window.bounceNative?.generateRankedSetups) return;
    const height = generateButton.dataset.generateHeight ?? "";
    const original = generateButton.textContent;
    generateButton.disabled = true;
    generateButton.textContent = "Generating...";
    setLiveStatus("loading");
    const result = await window.bounceNative.generateRankedSetups(height);
    if (result.ok) {
      generateButton.textContent = "Generated";
      await runCheck();
    } else {
      generateButton.textContent = result.error ?? "Generation failed";
      setLiveStatus("error");
    }
    setTimeout(() => {
      generateButton.disabled = false;
      generateButton.textContent = original;
    }, 2500);
  });

  el<HTMLDivElement>("setup-empty").addEventListener("keydown", async (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const button = (event.target as HTMLElement).closest("button") as HTMLButtonElement | null;
    if (!button) return;
    event.preventDefault();
    button.click();
  });

  el<HTMLButtonElement>("expand-setups").addEventListener("click", () => {
    for (const details of document.querySelectorAll<HTMLDetailsElement>(".setup-details")) {
      details.open = true;
    }
  });

  el<HTMLButtonElement>("collapse-setups").addEventListener("click", () => {
    for (const details of document.querySelectorAll<HTMLDetailsElement>(".setup-details")) {
      details.open = false;
    }
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

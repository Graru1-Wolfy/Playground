import presetsData from "./presets.json";
import {
  getDefaultWeights,
  loadWeights,
  type PreferenceWeights,
} from "./preferences.js";

export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  weights: Partial<PreferenceWeights>;
}

const ACTIVE_PRESET_KEY = "bounce-active-preset";

export const presetConfigs: PresetConfig[] = presetsData.presets;

export function resolvePresetWeights(preset: PresetConfig): PreferenceWeights {
  const base = getDefaultWeights();
  for (const [id, value] of Object.entries(preset.weights)) {
    if (value !== undefined) {
      base[id] = value;
    }
  }
  return base;
}

export function getPresetById(id: string): PresetConfig | undefined {
  return presetConfigs.find((preset) => preset.id === id);
}

export function getActivePresetId(): string | null {
  return localStorage.getItem(ACTIVE_PRESET_KEY);
}

export function setActivePresetId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(ACTIVE_PRESET_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_PRESET_KEY, id);
}

export function weightsMatch(a: PreferenceWeights, b: PreferenceWeights): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? 0) !== (b[key] ?? 0)) return false;
  }
  return true;
}

export function detectMatchingPreset(weights: PreferenceWeights): PresetConfig | null {
  for (const preset of presetConfigs) {
    if (weightsMatch(weights, resolvePresetWeights(preset))) {
      return preset;
    }
  }
  return null;
}

export function getActivePreset(weights = loadWeights()): PresetConfig | null {
  const storedId = getActivePresetId();
  if (storedId) {
    const stored = getPresetById(storedId);
    if (stored && weightsMatch(weights, resolvePresetWeights(stored))) {
      return stored;
    }
  }
  return detectMatchingPreset(weights);
}

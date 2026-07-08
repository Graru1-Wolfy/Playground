import preferencesConfig from "./preferences.json";
import type { DecodedSetup } from "@playground/schema";

export type PreferenceWeights = Record<string, number>;

const STORAGE_PREFIX = "bounce-pref-";

export function getDefaultWeights(): PreferenceWeights {
  const weights: PreferenceWeights = {};
  for (const group of preferencesConfig.groups) {
    for (const pref of group.preferences) {
      weights[pref.id] = pref.defaultWeight;
    }
  }
  return weights;
}

export function loadWeights(): PreferenceWeights {
  const weights = getDefaultWeights();
  for (const group of preferencesConfig.groups) {
    for (const pref of group.preferences) {
      const stored = localStorage.getItem(STORAGE_PREFIX + pref.id);
      if (stored !== null) {
        weights[pref.id] = Number(stored);
      }
    }
  }
  return weights;
}

export function saveWeight(id: string, value: number): void {
  localStorage.setItem(STORAGE_PREFIX + id, String(value));
}

export function saveWeights(weights: PreferenceWeights): void {
  for (const [id, value] of Object.entries(weights)) {
    saveWeight(id, value);
  }
}

export function resetWeights(): void {
  for (const group of preferencesConfig.groups) {
    for (const pref of group.preferences) {
      localStorage.removeItem(STORAGE_PREFIX + pref.id);
    }
  }
}

export function scoreSetup(setup: DecodedSetup, weights: PreferenceWeights): number {
  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const val = setup[key];
    if (typeof val === "number") {
      score += val * weight;
    }
  }
  return score;
}

export { preferencesConfig };

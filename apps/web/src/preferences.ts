import preferencesConfig from "./preferences.json";
import type { DecodedSetup } from "@playground/schema";

export type PreferenceWeights = Record<string, number>;

export interface PreferenceDefinition {
  id: string;
  label: string;
  defaultWeight: number;
  description: string;
}

/** Continuous scoring factors — keep range sliders. */
export const SLIDER_PREFERENCE_IDS = new Set<string>([
  "HEIGHT",
  "DIST",
  "SPEED",
  "COMPACT",
  "QUICK",
]);

const STORAGE_PREFIX = "bounce-pref-";

export function isSliderPreference(pref: PreferenceDefinition): boolean {
  return SLIDER_PREFERENCE_IDS.has(pref.id);
}

/** Weight applied when a logical preference toggle is enabled. */
export function activeWeightForPreference(pref: PreferenceDefinition): number {
  if (pref.defaultWeight < 0) return pref.defaultWeight;
  if (pref.defaultWeight !== 0) return pref.defaultWeight;
  return 128;
}

export function isPreferenceEnabled(pref: PreferenceDefinition, weight: number): boolean {
  if (pref.defaultWeight < 0) return weight < 0;
  return weight !== 0;
}

export function weightFromToggle(pref: PreferenceDefinition, enabled: boolean): number {
  return enabled ? activeWeightForPreference(pref) : 0;
}

export function loadWeights(): PreferenceWeights {
  const weights: PreferenceWeights = {};
  for (const group of preferencesConfig.groups) {
    for (const pref of group.preferences) {
      const stored = localStorage.getItem(STORAGE_PREFIX + pref.id);
      weights[pref.id] = stored !== null ? Number(stored) : pref.defaultWeight;
    }
  }
  return weights;
}

export function saveWeight(id: string, value: number): void {
  localStorage.setItem(STORAGE_PREFIX + id, String(value));
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

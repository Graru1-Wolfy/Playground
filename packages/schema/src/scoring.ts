import type { DecodedSetup } from "./decode.js";
import preferencesConfig from "./preferences.json" with { type: "json" };
import type { PreferenceWeights, RankedSetup, SerializedSetup } from "./types.js";
import { serializeSetup } from "./serialize.js";

export function defaultPreferenceWeights(): PreferenceWeights {
  const weights: PreferenceWeights = {};
  for (const group of preferencesConfig.groups) {
    for (const pref of group.preferences) {
      weights[pref.id] = pref.defaultWeight;
    }
  }
  return weights;
}

export function scoreSetup(setup: DecodedSetup, weights: PreferenceWeights): number {
  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const val = setup[key as keyof DecodedSetup];
    if (typeof val === "number") {
      score += val * weight;
    }
  }
  return score;
}

export function rankSetups(
  setups: DecodedSetup[],
  weights: PreferenceWeights = defaultPreferenceWeights(),
): RankedSetup[] {
  const scored = setups
    .map((setup) => ({ setup, score: scoreSetup(setup, weights) }))
    .sort((a, b) => b.score - a.score);

  return scored.map(({ setup, score }, index) => ({
    ...serializeSetup(setup),
    rank: index + 1,
    score,
  }));
}

import type { DecodedSetup } from "./decode.js";
import preferencesConfig from "./preferences.json" with { type: "json" };
import type { SetupFlag } from "./decode.js";

/** Continuous trajectory factors — not shown as row tags. */
export const TRAJECTORY_FLAG_IDS = new Set<string>(["HEIGHT", "DIST", "SPEED", "COMPACT", "QUICK"]);

/** Launcher flags — rendered as the launcher pill instead. */
export const LAUNCHER_FLAG_IDS = new Set<string>(["STOCK", "ORIG", "MANG"]);

export interface SetupTag {
  id: SetupFlag | string;
  label: string;
  value: number;
  tone: string;
}

const TAG_TONE_BY_GROUP: Record<string, string> = {
  "Type of bounce": "tag-bounce",
  Complexity: "tag-neutral",
  "Automatic bounce": "tag-auto",
  "Fully automatic bounce": "tag-fullauto",
  "Advanced bounce": "tag-stand",
  Movement: "tag-neutral",
  Action: "tag-sync",
};

const preferenceMeta = new Map<string, { label: string; group: string }>();
for (const group of preferencesConfig.groups) {
  for (const pref of group.preferences) {
    preferenceMeta.set(pref.id, { label: pref.label, group: group.name });
  }
}

function tagTone(group: string): string {
  return TAG_TONE_BY_GROUP[group] ?? "tag-neutral";
}

export function getSetupTags(setup: DecodedSetup, limit = 5): SetupTag[] {
  const tags: SetupTag[] = [];

  for (const [id, meta] of preferenceMeta) {
    if (LAUNCHER_FLAG_IDS.has(id) || TRAJECTORY_FLAG_IDS.has(id)) continue;
    const value = setup[id as keyof DecodedSetup];
    if (typeof value !== "number" || value <= 0) continue;
    tags.push({
      id,
      label: meta.label,
      value,
      tone: tagTone(meta.group),
    });
  }

  tags.sort((a, b) => b.value - a.value);
  return tags.slice(0, limit);
}

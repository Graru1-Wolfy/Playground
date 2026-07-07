import type { BounceInput } from "./bounce.js";
import type { WeaponName } from "./constants.js";

const WILDCARD = "*";

export interface FormattedBounceData {
  bounces: Record<string, BounceInput[]>;
  list: { types: string[]; weapons: WeaponName[] };
}

export function formatBounceJSON(
  data: Record<string, BounceInput[]>,
  weapons?: Set<WeaponName>,
): FormattedBounceData {
  const weaponSet = weapons ?? new Set<WeaponName>();
  if (!weapons) {
    for (const arr of Object.values(data)) {
      for (const entry of arr) {
        const w = (entry as BounceInput & { all?: BounceInput }).all ?? entry;
        if (w.weapon && w.weapon !== (WILDCARD as WeaponName)) {
          weaponSet.add(w.weapon);
        }
      }
    }
  }

  for (const type in data) {
    const arr = data[type];
    for (let i = 0; i < arr.length; i++) {
      const bounce = arr[i] as BounceInput & {
        all?: BounceInput;
        bounces?: BounceInput[];
        vel?: number | number[];
        offs?: number | number[];
        text?: string;
      };
      const bulk: BounceInput[] = [];

      if (bounce.all) {
        arr.splice(i, 1);
        for (let j = i; j < arr.length; j++) {
          if ((arr[j] as BounceInput & { all?: BounceInput }).all) break;
          arr[j] = { ...arr[j], ...bounce.all };
        }
        i--;
        continue;
      }

      if (bounce.weapon === (WILDCARD as WeaponName)) {
        for (const weapon of weaponSet) bulk.push({ ...bounce, weapon });
      } else if (Array.isArray(bounce.offs)) {
        bounce.offs.forEach((offs, idx) => {
          bulk.push({
            ...bounce,
            offs,
            text: bounce.text?.replace(WILDCARD, String(idx + 1)),
          });
        });
      } else if (Array.isArray(bounce.vel)) {
        bounce.vel.forEach((vel) => {
          bulk.push({
            ...bounce,
            vel,
            text: bounce.text?.replace(WILDCARD, String(vel)),
          });
        });
      } else if (bounce.bounces) {
        bounce.bounces.forEach((b) => {
          const c = { ...bounce };
          delete (c as { bounces?: BounceInput[] }).bounces;
          bulk.push({ ...c, ...b });
        });
      }

      if (bulk.length) arr.splice(i, 1, ...bulk);
    }
  }

  return {
    bounces: data,
    list: { types: Object.keys(data), weapons: Array.from(weaponSet) },
  };
}

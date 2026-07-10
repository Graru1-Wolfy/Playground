import type { DecodedSetupCore, SetupFlag } from "./decode.js";

export type SetupDataSource = "generated" | "sample" | "none";

export interface SerializedSetupCore {
  ID: string;
  launcher: number;
  start_moving: number;
  start_action: number;
  num_rockets: number;
  tick_delay_auto_bounce: number;
  tick_delay_auto_synced_bounce: number;
  tick_delay_auto_standing_bounce: number;
  tick_delay_auto_synced_standing_bounce: number;
  bounce_flag: number;
  standing_bounce_flag: number;
  rocket_fired_crouched_flag: number;
  rocket_hit_crouched_flag: number;
  speeds: number[];
}

/** JSON-safe setup record (bigint ID serialized as string). */
export type SerializedSetup = SerializedSetupCore & Partial<Record<SetupFlag, number>>;

export interface RankedSetup extends SerializedSetup {
  rank: number;
  score: number;
}

export type PreferenceWeights = Record<string, number>;

export interface SetupListResponse {
  height: number;
  rawHeight: number;
  source: SetupDataSource;
  ranked: boolean;
  count: number;
  total: number;
  setups: RankedSetup[] | SerializedSetup[];
}

export type { DecodedSetupCore };

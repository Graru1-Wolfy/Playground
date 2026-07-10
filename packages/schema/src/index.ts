export { RECORD_SIZE, FLAG_NAMES, decodeSetup, decodeSetupFile, decodeSetupBytes } from "./decode.js";
export type { DecodedSetup, SetupFlag } from "./decode.js";
export { serializeSetup } from "./serialize.js";
export {
  defaultPreferenceWeights,
  rankSetups,
  scoreSetup,
} from "./scoring.js";
export { getSetupTags, LAUNCHER_FLAG_IDS, TRAJECTORY_FLAG_IDS } from "./tags.js";
export type { SetupTag } from "./tags.js";
export type {
  PreferenceWeights,
  RankedSetup,
  SerializedSetup,
  SetupDataSource,
  SetupListResponse,
} from "./types.js";
export { preferencesConfig } from "./preferences.js";
export {
  DEFAULT_START_GUIDES,
  formatBindBlock,
  formatGuideBindBlock,
  generateSetupBinds,
  generateSetupInstructions,
  movementBind,
  actionBind,
} from "./binds.js";
export type { BindPair, DefaultStartGuide, SetupBinds } from "./binds.js";

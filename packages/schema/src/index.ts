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
  ACTION_PATTERN_COUNT,
  MOVEMENT_PATTERN_COUNT,
  describeActionPattern,
  describeActionPatternDetail,
  describeMovementPattern,
  describeMovementPatternDetail,
  formatBindBlock,
  formatGuideBindBlock,
  generateSetupBinds,
  generateSetupInstructions,
  hasResolvablePatterns,
  inferActionPattern,
  inferMovementPattern,
  isMovementAllowedForLauncher,
  isValidActionPattern,
  isValidMovementPattern,
  movementBind,
  actionBind,
  resolveActionPattern,
  resolveMovementPattern,
  resolveSetupPatterns,
} from "./binds.js";
export type { BindPair, DefaultStartGuide, ResolvedSetupPatterns, SetupBinds } from "./binds.js";

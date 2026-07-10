import type { DecodedSetup } from "./decode.js";

export interface BindPair {
  plus: string;
  minus: string;
}

export interface DefaultStartGuide {
  label: string;
  movement: BindPair;
  action: BindPair;
  instructions: string[];
}

export interface SetupBinds {
  movement: BindPair;
  action: BindPair;
  lines: string[];
}

const MOVEMENT_BINDS: BindPair[] = [
  { plus: 'alias +walk "";', minus: 'alias -walk "";' },
  { plus: 'alias +walk "+forward";', minus: 'alias -walk "-forward -1";' },
  { plus: 'alias +walk "+back";', minus: 'alias -walk "-back -1";' },
  { plus: 'alias +walk "+moveleft";', minus: 'alias -walk "-moveleft -1";' },
  { plus: 'alias +walk "+moveright";', minus: 'alias -walk "-moveright -1";' },
  { plus: 'alias +walk "+forward; +moveleft";', minus: 'alias -walk "-forward -1; -moveleft -1";' },
  { plus: 'alias +walk "+forward; +moveright";', minus: 'alias -walk "-forward -1; -moveright -1";' },
  { plus: 'alias +walk "+back; +moveleft";', minus: 'alias -walk "-back -1; -moveleft -1";' },
  { plus: 'alias +walk "+back; +moveright";', minus: 'alias -walk "-back -1; -moveright -1";' },
  { plus: 'alias +walk "+moveup; +forward";', minus: 'alias -walk "-moveup -1; -forward -1";' },
  { plus: 'alias +walk "+moveup; +back";', minus: 'alias -walk "-moveup -1; -back -1";' },
  { plus: 'alias +walk "+moveup; +moveleft";', minus: 'alias -walk "-moveup -1; -moveleft -1";' },
  { plus: 'alias +walk "+moveup; +moveright";', minus: 'alias -walk "-moveup -1; -moveright -1";' },
  {
    plus: 'alias +walk "+moveup; +forward; +moveleft";',
    minus: 'alias -walk "-moveup -1; -forward -1; -moveleft -1";',
  },
  {
    plus: 'alias +walk "+moveup; +forward; +moveright";',
    minus: 'alias -walk "-moveup -1; -forward -1; -moveright -1";',
  },
  {
    plus: 'alias +walk "+moveup; +back; +moveleft";',
    minus: 'alias -walk "-moveup -1; -back -1; -moveleft -1";',
  },
  {
    plus: 'alias +walk "+moveup; +back; +moveright";',
    minus: 'alias -walk "-moveup -1; -back -1; -moveright -1";',
  },
  {
    plus: 'alias +walk "+forward; +moveleft; +strafe; +left";',
    minus: 'alias -walk "-forward -1; -moveleft -1; -strafe -1; -left -1";',
  },
  {
    plus: 'alias +walk "+forward; +moveright; +strafe; +right";',
    minus: 'alias -walk "-forward -1; -moveright -1; -strafe -1; -right -1";',
  },
  {
    plus: 'alias +walk "+back; +moveleft; +strafe; +left";',
    minus: 'alias -walk "-back -1; -moveleft -1; -strafe -1; -left -1";',
  },
  {
    plus: 'alias +walk "+back; +moveright; +strafe; +right";',
    minus: 'alias -walk "-back -1; -moveright -1; -strafe -1; -right -1";',
  },
  {
    plus: 'alias +walk "+moveup; +forward; +moveleft; +strafe; +left";',
    minus: 'alias -walk "-moveup -1; -forward -1; -moveleft -1; -strafe -1; -left -1";',
  },
  {
    plus: 'alias +walk "+moveup; +forward; +moveright; +strafe; +right";',
    minus: 'alias -walk "-moveup -1; -forward -1; -moveright -1; -strafe -1; -right -1";',
  },
  {
    plus: 'alias +walk "+moveup; +back; +moveleft; +strafe; +left";',
    minus: 'alias -walk "-moveup -1; -back -1; -moveleft -1; -strafe -1; -left -1";',
  },
  {
    plus: 'alias +walk "+moveup; +back; +moveright; +strafe; +right";',
    minus: 'alias -walk "-moveup -1; -back -1; -moveright -1; -strafe -1; -right -1";',
  },
  {
    plus: 'alias +walk "+moveup; +moveleft; +strafe; +left";',
    minus: 'alias -walk "-moveup -1; -moveleft -1; -strafe -1; -left -1";',
  },
  {
    plus: 'alias +walk "+moveup; +moveright; +strafe; +right";',
    minus: 'alias -walk "-moveup -1; -moveright -1; -strafe -1; -right -1";',
  },
];

const ACTION_BINDS: BindPair[] = [
  { plus: 'alias +strike "+attack";', minus: 'alias -strike "-attack -1";' },
  { plus: 'alias +strike "+attack";', minus: 'alias -strike "-attack -1";' },
  { plus: 'alias +strike "+attack; +jump; -jump -1";', minus: 'alias -strike "-attack -1";' },
  { plus: 'alias +strike "+attack; +jump; -jump -1; +duck";', minus: 'alias -strike "-attack -1; -duck -1";' },
  { plus: 'alias +strike "+attack; +jump; -jump -1; +duck; -duck -1";', minus: 'alias -strike "-attack -1";' },
  { plus: 'alias +strike "slot1; +attack; +jump; -jump -1";', minus: 'alias -strike "-attack -1";' },
  { plus: 'alias +strike "slot1; +attack; +jump; -jump -1; +duck";', minus: 'alias -strike "-attack -1; -duck -1";' },
  { plus: 'alias +strike "slot1; +attack; +jump; -jump -1; +duck; -duck -1";', minus: 'alias -strike "-attack -1";' },
  { plus: 'alias +strike "+attack; +jump; -jump -1; +duck; -duck -1";', minus: 'alias -strike "-attack -1";' },
  { plus: 'alias +strike "+attack; +jump; -jump -1; +duck; -duck -1";', minus: 'alias -strike "-attack -1";' },
];

const MOVEMENT_LABELS = [
  "No movement",
  "Forward",
  "Back",
  "Left",
  "Right",
  "Forward + left",
  "Forward + right",
  "Back + left",
  "Back + right",
  "+moveup + forward",
  "+moveup + back",
  "+moveup + left",
  "+moveup + right",
  "+moveup + forward + left",
  "+moveup + forward + right",
  "+moveup + back + left",
  "+moveup + back + right",
  "Forward + left + strafe",
  "Forward + right + strafe",
  "Back + left + strafe",
  "Back + right + strafe",
  "+moveup + forward + left + strafe",
  "+moveup + forward + right + strafe",
  "+moveup + back + left + strafe",
  "+moveup + back + right + strafe",
  "+moveup + left + strafe",
  "+moveup + right + strafe",
];

const MOVEMENT_DESCRIPTIONS = [
  "Empty +walk alias — stand still off the edge.",
  "Hold +forward over the drop.",
  "Hold +back over the drop.",
  "Hold +moveleft over the drop.",
  "Hold +moveright over the drop.",
  "Hold +forward and +moveleft (diagonal).",
  "Hold +forward and +moveright (diagonal).",
  "Hold +back and +moveleft (diagonal).",
  "Hold +back and +moveright (diagonal).",
  "+moveup with +forward.",
  "+moveup with +back.",
  "+moveup with +moveleft.",
  "+moveup with +moveright.",
  "+moveup, +forward, and +moveleft.",
  "+moveup, +forward, and +moveright.",
  "+moveup, +back, and +moveleft.",
  "+moveup, +back, and +moveright.",
  "+forward, +moveleft, +strafe, and +left.",
  "+forward, +moveright, +strafe, and +right.",
  "+back, +moveleft, +strafe, and +left.",
  "+back, +moveright, +strafe, and +right.",
  "+moveup, +forward, +moveleft, +strafe, and +left.",
  "+moveup, +forward, +moveright, +strafe, and +right.",
  "+moveup, +back, +moveleft, +strafe, and +left.",
  "+moveup, +back, +moveright, +strafe, and +right.",
  "+moveup, +moveleft, +strafe, and +left.",
  "+moveup, +moveright, +strafe, and +right.",
];

const ACTION_LABELS = [
  "Shoot only",
  "Shoot only (crouched start)",
  "Jump shoot",
  "Jump duck shoot",
  "CTAP jump duck shoot",
  "Quickswap jump shoot",
  "Quickswap jump duck shoot",
  "Quickswap CTAP jump duck shoot",
  "CTAP jump duck shoot (1 tick early)",
  "CTAP jump duck shoot (2 ticks early)",
];

const ACTION_DESCRIPTIONS = [
  "+strike fires +attack only.",
  "Start crouched, then +strike fires +attack.",
  "+strike does +attack with a jump tap.",
  "+strike jump-shoots and holds +duck.",
  "+strike CTAP jump duck shoot (+duck tap).",
  "Quickswap to slot1, then jump shoot.",
  "Quickswap to slot1, then jump duck shoot.",
  "Quickswap to slot1, then CTAP jump duck shoot.",
  "CTAP jump duck shoot, rocket prefire 1 tick early.",
  "CTAP jump duck shoot, rocket prefire 2 ticks early.",
];

/** Movement patterns excluded for Original to remove symmetries (engine-sim). */
const ORIGINAL_EXCLUDED_MOVEMENT = new Set([4, 6, 8, 12, 14, 16, 18, 20, 23, 24, 26]);

export const MOVEMENT_PATTERN_COUNT = MOVEMENT_BINDS.length;
export const ACTION_PATTERN_COUNT = ACTION_BINDS.length;

export function isValidMovementPattern(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < MOVEMENT_PATTERN_COUNT;
}

export function isValidActionPattern(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < ACTION_PATTERN_COUNT;
}

export function isMovementAllowedForLauncher(launcher: number, pattern: number): boolean {
  if (!isValidMovementPattern(pattern)) return false;
  if (launcher === 1 && ORIGINAL_EXCLUDED_MOVEMENT.has(pattern)) return false;
  return true;
}

export function describeMovementPattern(index: number): string | null {
  return MOVEMENT_LABELS[index] ?? null;
}

export function describeActionPattern(index: number): string | null {
  return ACTION_LABELS[index] ?? null;
}

export function describeMovementPatternDetail(index: number): string | null {
  return MOVEMENT_DESCRIPTIONS[index] ?? null;
}

export function describeActionPatternDetail(index: number): string | null {
  return ACTION_DESCRIPTIONS[index] ?? null;
}

export function inferMovementPattern(setup: DecodedSetup): number | null {
  if (isValidMovementPattern(setup.start_moving)) {
    return isMovementAllowedForLauncher(setup.launcher, setup.start_moving)
      ? setup.start_moving
      : null;
  }
  if (setup.NOMOVING && setup.NOMOVING > 0) return 0;
  return null;
}

export function inferActionPattern(setup: DecodedSetup): number | null {
  if (isValidActionPattern(setup.start_action)) return setup.start_action;
  if (setup.ONETICK && setup.ONETICK > 0) return 8;
  if (setup.TWOTICK && setup.TWOTICK > 0) return 9;
  if (setup.CTAP_JDS && setup.CTAP_JDS > 0) return 4;
  if (setup.JDS && setup.JDS > 0) return 3;
  if (setup.JS && setup.JS > 0) return 2;
  if (setup.SHOTGUN && setup.SHOTGUN > 0) {
    if (setup.CTAP_JDS && setup.CTAP_JDS > 0) return 7;
    if (setup.JDS && setup.JDS > 0 || (setup.CROUCHED && setup.CROUCHED > 0)) return 6;
    return 5;
  }
  if (setup.CROUCHED && setup.CROUCHED > 0) return 1;
  return null;
}

export function resolveMovementPattern(setup: DecodedSetup): number | null {
  return inferMovementPattern(setup);
}

export function resolveActionPattern(setup: DecodedSetup): number | null {
  return inferActionPattern(setup);
}

export function hasResolvablePatterns(setup: DecodedSetup): boolean {
  return resolveMovementPattern(setup) !== null && resolveActionPattern(setup) !== null;
}

export interface ResolvedSetupPatterns {
  movement: number;
  action: number;
  movementLabel: string;
  actionLabel: string;
  movementDetail: string;
  actionDetail: string;
}

export function resolveSetupPatterns(setup: DecodedSetup): ResolvedSetupPatterns | null {
  const movement = resolveMovementPattern(setup);
  const action = resolveActionPattern(setup);
  if (movement === null || action === null) return null;

  const movementLabel = describeMovementPattern(movement);
  const actionLabel = describeActionPattern(action);
  const movementDetail = describeMovementPatternDetail(movement);
  const actionDetail = describeActionPatternDetail(action);
  if (!movementLabel || !actionLabel || !movementDetail || !actionDetail) return null;

  return { movement, action, movementLabel, actionLabel, movementDetail, actionDetail };
}

export const DEFAULT_START_GUIDES: DefaultStartGuide[] = [
  {
    label: "Walk",
    movement: MOVEMENT_BINDS[1]!,
    action: ACTION_BINDS[0]!,
    instructions: [
      "Bind movement to +walk (example: bind shift +walk).",
      "Bind fire to +strike (example: bind mouse1 +strike).",
      "Face the drop and hold +walk over the edge.",
      "Do not crouch — stay standing through the fall.",
      "Land uncrouched on the target height.",
    ],
  },
  {
    label: "Crouch Walk",
    movement: MOVEMENT_BINDS[1]!,
    action: ACTION_BINDS[1]!,
    instructions: [
      "Bind movement to +walk and fire to +strike.",
      "Crouch before reaching the drop edge.",
      "Hold +walk while crouched over the edge.",
      "Stay crouched for the entire fall.",
      "Land crouched on the target height.",
    ],
  },
  {
    label: "Jump",
    movement: MOVEMENT_BINDS[1]!,
    action: ACTION_BINDS[2]!,
    instructions: [
      "Bind movement to +walk and fire to +strike.",
      "Run with +walk toward the drop edge.",
      "Press +strike at the edge for jump shoot (+attack; +jump).",
      "Release +strike after the jump input.",
      "Land uncrouched on the target height.",
    ],
  },
  {
    label: "Crouch Jump",
    movement: MOVEMENT_BINDS[1]!,
    action: ACTION_BINDS[3]!,
    instructions: [
      "Bind movement to +walk and fire to +strike.",
      "Run with +walk toward the drop edge.",
      "Press +strike at the edge for jump duck shoot (+attack; +jump; +duck).",
      "Hold crouch through the fall after the jump.",
      "Land crouched on the target height.",
    ],
  },
  {
    label: "Ctap",
    movement: MOVEMENT_BINDS[1]!,
    action: ACTION_BINDS[4]!,
    instructions: [
      "Bind movement to +walk and fire to +strike.",
      "Run with +walk toward the drop edge.",
      "Press +strike at the edge for CTAP jump duck shoot (+duck; -duck tap).",
      "Time the CTAP so crouch state matches the crouched landing.",
      "Land crouched on the target height.",
    ],
  },
  {
    label: "Ceilingsmash",
    movement: MOVEMENT_BINDS[1]!,
    action: ACTION_BINDS[0]!,
    instructions: [
      "Enable ceiling gap and set floor-to-ceiling distance.",
      "Bind movement to +walk and fire to +strike.",
      "Position under the ceiling smash target height.",
      "Hold +walk off the ledge or drop straight down.",
      "Ceiling gap height is used instead of target height for the check.",
    ],
  },
];

export function movementBind(startMoving: number): BindPair | null {
  if (!isValidMovementPattern(startMoving)) return null;
  return MOVEMENT_BINDS[startMoving] ?? null;
}

export function actionBind(startAction: number): BindPair | null {
  if (!isValidActionPattern(startAction)) return null;
  return ACTION_BINDS[startAction] ?? null;
}

export function generateSetupBinds(setup: DecodedSetup): SetupBinds | null {
  const resolved = resolveSetupPatterns(setup);
  if (!resolved) return null;

  const movement = movementBind(resolved.movement);
  const action = actionBind(resolved.action);
  if (!movement || !action) return null;

  return {
    movement,
    action,
    lines: [movement.plus, movement.minus, action.plus, action.minus],
  };
}

function isSetDelay(delay: number): boolean {
  return delay >= 0 && delay < 255;
}

function autoDelayInstruction(label: string, delay: number): string {
  if (delay === 0) {
    return `${label}: fully automatic — hold +attack from rocket sync (look down).`;
  }
  return `${label}: hold +attack ${delay} tick${delay === 1 ? "" : "s"} after synced rocket explosion.`;
}

function rocketCrouchNotes(setup: DecodedSetup): string[] {
  const notes: string[] = [];
  if (setup.rocket_fired_crouched_flag) {
    notes.push(`Rockets fired crouched flag: ${setup.rocket_fired_crouched_flag}.`);
  }
  if (setup.rocket_hit_crouched_flag) {
    notes.push(`Rockets hit crouched flag: ${setup.rocket_hit_crouched_flag}.`);
  }
  return notes;
}

export function generateSetupInstructions(setup: DecodedSetup): string[] {
  const lines: string[] = [];
  const patterns = resolveSetupPatterns(setup);

  if (patterns) {
    lines.push(`Movement: ${patterns.movementLabel} — ${patterns.movementDetail}`);
    lines.push(`Start action: ${patterns.actionLabel} — ${patterns.actionDetail}`);
  }

  if (patterns?.action === 1) {
    lines.push("Start crouched before pressing +strike.");
  }
  if (patterns?.action === 8) {
    lines.push("Prefire 1 tick early.");
  }
  if (patterns?.action === 9) {
    lines.push("Prefire 2 ticks early.");
  }

  if (setup.num_rockets === 0) {
    lines.push("No rockets — drop-only setup.");
  } else {
    lines.push(`Fire ${setup.num_rockets} rocket${setup.num_rockets === 1 ? "" : "s"} with +strike.`);
  }

  if (setup.BOUNCE && setup.BOUNCE > 0) lines.push("Crouched bounce on landing.");
  if (setup.BHOP && setup.BHOP > 0) lines.push("Bhop after the first bounce.");
  if (setup.JB && setup.JB > 0) lines.push("Jumpbug on landing.");
  if (setup.STANDBOUNCE && setup.STANDBOUNCE > 0) lines.push("Standing bounce window.");
  if (setup.PB && setup.PB > 0) lines.push("Power bounce.");
  if (setup.JBPB && setup.JBPB > 0) lines.push("Jumpbug power bounce.");
  if (setup.SBOUNCE && setup.SBOUNCE > 0) lines.push("Synced bounce.");
  if (setup.SPB && setup.SPB > 0) lines.push("Synced power bounce.");
  if (setup.SJBPB && setup.SJBPB > 0) lines.push("Synced jumpbug power bounce.");
  if (setup.SSTANDBOUNCE && setup.SSTANDBOUNCE > 0) lines.push("Synced standing bounce.");

  if (setup.FASBOUNCE && setup.FASBOUNCE > 0 && isSetDelay(setup.tick_delay_auto_synced_bounce)) {
    lines.push(autoDelayInstruction("Fully auto synced bounce", setup.tick_delay_auto_synced_bounce));
  } else if (setup.ASBOUNCE && setup.ASBOUNCE > 0 && isSetDelay(setup.tick_delay_auto_synced_bounce)) {
    lines.push(autoDelayInstruction("Auto synced bounce", setup.tick_delay_auto_synced_bounce));
  } else if (setup.FABOUNCE && setup.FABOUNCE > 0 && isSetDelay(setup.tick_delay_auto_bounce)) {
    lines.push(autoDelayInstruction("Fully auto bounce", setup.tick_delay_auto_bounce));
  } else if (setup.ABOUNCE && setup.ABOUNCE > 0 && isSetDelay(setup.tick_delay_auto_bounce)) {
    lines.push(autoDelayInstruction("Auto bounce", setup.tick_delay_auto_bounce));
  }

  if (setup.FASSTANDBOUNCE && setup.FASSTANDBOUNCE > 0 && isSetDelay(setup.tick_delay_auto_synced_standing_bounce)) {
    lines.push(autoDelayInstruction("Fully auto synced standing bounce", setup.tick_delay_auto_synced_standing_bounce));
  } else if (setup.ASSTANDBOUNCE && setup.ASSTANDBOUNCE > 0 && isSetDelay(setup.tick_delay_auto_synced_standing_bounce)) {
    lines.push(autoDelayInstruction("Auto synced standing bounce", setup.tick_delay_auto_synced_standing_bounce));
  } else if (setup.FASTANDBOUNCE && setup.FASTANDBOUNCE > 0 && isSetDelay(setup.tick_delay_auto_standing_bounce)) {
    lines.push(autoDelayInstruction("Fully auto standing bounce", setup.tick_delay_auto_standing_bounce));
  } else   if (setup.ASTANDBOUNCE && setup.ASTANDBOUNCE > 0 && isSetDelay(setup.tick_delay_auto_standing_bounce)) {
    lines.push(autoDelayInstruction("Auto standing bounce", setup.tick_delay_auto_standing_bounce));
  }

  if (patterns) {
    lines.push("Bind keys: bind <key> +walk and bind <key> +strike.");
  }

  lines.push(...rocketCrouchNotes(setup));

  return lines;
}

export function formatBindBlock(binds: SetupBinds): string {
  return binds.lines.join("\n");
}

export function formatGuideBindBlock(guide: DefaultStartGuide): string {
  return [guide.movement.plus, guide.movement.minus, guide.action.plus, guide.action.minus].join("\n");
}

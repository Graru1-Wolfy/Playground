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

export function movementBind(startMoving: number): BindPair {
  return MOVEMENT_BINDS[startMoving] ?? MOVEMENT_BINDS[0]!;
}

export function actionBind(startAction: number): BindPair {
  return ACTION_BINDS[startAction] ?? ACTION_BINDS[0]!;
}

export function generateSetupBinds(setup: DecodedSetup): SetupBinds {
  const movement = movementBind(setup.start_moving);
  const action = actionBind(setup.start_action);
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

  lines.push(`Movement: ${MOVEMENT_LABELS[setup.start_moving] ?? `pattern ${setup.start_moving}`}.`);
  lines.push(`Start action: ${ACTION_LABELS[setup.start_action] ?? `pattern ${setup.start_action}`}.`);

  if (setup.start_action === 1) {
    lines.push("Start crouched before pressing +strike.");
  }
  if (setup.start_action === 8) {
    lines.push("Prefire 1 tick early.");
  }
  if (setup.start_action === 9) {
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
  } else if (setup.ASTANDBOUNCE && setup.ASTANDBOUNCE > 0 && isSetDelay(setup.tick_delay_auto_standing_bounce)) {
    lines.push(autoDelayInstruction("Auto standing bounce", setup.tick_delay_auto_standing_bounce));
  }

  lines.push("Bind keys: bind <key> +walk and bind <key> +strike.");
  lines.push(...rocketCrouchNotes(setup));

  return lines;
}

export function formatBindBlock(binds: SetupBinds): string {
  return binds.lines.join("\n");
}

export function formatGuideBindBlock(guide: DefaultStartGuide): string {
  return [guide.movement.plus, guide.movement.minus, guide.action.plus, guide.action.minus].join("\n");
}

/** Binary setup record constants (must match engine_sim.setups). */

export const RECORD_SIZE = 92;

export const FLAG_NAMES = [
  "STOCK",
  "ORIG",
  "MANG",
  "BOUNCE",
  "BHOP",
  "JB",
  "SIMPLE",
  "CONSIST",
  "NOMOVEMENTBIND",
  "NOACTIONBIND",
  "ABOUNCE",
  "ASBOUNCE",
  "ASTANDBOUNCE",
  "ASSTANDBOUNCE",
  "FABOUNCE",
  "FASBOUNCE",
  "FASTANDBOUNCE",
  "FASSTANDBOUNCE",
  "HEIGHT",
  "DIST",
  "SPEED",
  "COMPACT",
  "QUICK",
  "STANDBOUNCE",
  "PB",
  "JBPB",
  "SBOUNCE",
  "SPB",
  "SJBPB",
  "SSTANDBOUNCE",
  "CROUCHED",
  "NOMOVING",
  "DIAGONAL",
  "MOVEUP",
  "STRAFE",
  "SHOTGUN",
  "ZEROROCKET",
  "ONEROCKET",
  "TWOTHREEROCKETS",
  "JS",
  "JDS",
  "CTAP_JDS",
  "ONETICK",
  "TWOTICK",
] as const;

export type SetupFlag = (typeof FLAG_NAMES)[number];

export interface DecodedSetupCore {
  ID: bigint;
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

export type DecodedSetup = DecodedSetupCore & Partial<Record<SetupFlag, number>>;

export function decodeSetup(view: DataView, offset: number): DecodedSetup {
  let cursor = offset;
  const setup: DecodedSetup = {
    ID: view.getBigUint64(cursor, true),
    launcher: 0,
    start_moving: 0,
    start_action: 0,
    num_rockets: 0,
    tick_delay_auto_bounce: 0,
    tick_delay_auto_synced_bounce: 0,
    tick_delay_auto_standing_bounce: 0,
    tick_delay_auto_synced_standing_bounce: 0,
    bounce_flag: 0,
    standing_bounce_flag: 0,
    rocket_fired_crouched_flag: 0,
    rocket_hit_crouched_flag: 0,
    speeds: [],
  };
  cursor += 8;

  setup.launcher = view.getUint8(cursor++);
  setup.start_moving = view.getUint8(cursor++);
  setup.start_action = view.getUint8(cursor++);
  setup.num_rockets = view.getUint8(cursor++);
  setup.tick_delay_auto_bounce = view.getUint8(cursor++);
  setup.tick_delay_auto_synced_bounce = view.getUint8(cursor++);
  setup.tick_delay_auto_standing_bounce = view.getUint8(cursor++);
  setup.tick_delay_auto_synced_standing_bounce = view.getUint8(cursor++);
  setup.bounce_flag = view.getUint8(cursor++);
  setup.standing_bounce_flag = view.getUint8(cursor++);
  setup.rocket_fired_crouched_flag = view.getUint8(cursor++);
  setup.rocket_hit_crouched_flag = view.getUint8(cursor++);

  for (const flag of FLAG_NAMES) {
    setup[flag] = view.getUint8(cursor++);
  }

  const speeds: number[] = [];
  for (let i = 0; i < 7; i++) {
    speeds.push(view.getUint32(cursor, true) / 100);
    cursor += 4;
  }
  setup.speeds = speeds.slice(0, setup.num_rockets + 1);
  return setup;
}

export function decodeSetupFile(buffer: ArrayBuffer): DecodedSetup[] {
  const view = new DataView(buffer);
  const setups: DecodedSetup[] = [];
  for (let offset = 0; offset + RECORD_SIZE <= buffer.byteLength; offset += RECORD_SIZE) {
    setups.push(decodeSetup(view, offset));
  }
  return setups;
}

/** Decode from Node Buffer / Uint8Array without accidental pool offset bugs. */
export function decodeSetupBytes(data: Uint8Array | ArrayBuffer): DecodedSetup[] {
  if (data instanceof ArrayBuffer) {
    return decodeSetupFile(data);
  }
  const slice = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  return decodeSetupFile(slice as ArrayBuffer);
}

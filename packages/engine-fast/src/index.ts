export {
  ARANGE,
  DRANGE,
  EPSILON,
  GRAVITY,
  LandType,
  MAXVEL,
  OFFSET,
  PLAYER,
  TICK,
  TICKGRAV,
  WEAPONS,
  type WeaponName,
} from "./constants.js";

export {
  canBounce,
  getLandTickFromStartZVel,
  getMaxVelTickFromStartZVel,
  getValidHeight,
  getZFromTick,
} from "./physics.js";

export { getVelFromAngle } from "./velocity.js";

export {
  checkBounce,
  getBounceAngles,
  getBounces,
  type BounceInput,
  type BounceResult,
} from "./bounce.js";

export { formatBounceJSON, type FormattedBounceData } from "./format.js";

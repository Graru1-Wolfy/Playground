import type { DecodedSetup } from "./decode.js";
import type { SerializedSetup } from "./types.js";

export function serializeSetup(setup: DecodedSetup): SerializedSetup {
  return {
    ...setup,
    ID: setup.ID.toString(),
  };
}

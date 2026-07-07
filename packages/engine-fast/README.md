# engine-fast

Analytical TF2 bounce math for instant DEFAULT / Walk / Jump / Ctap checks in the browser or CLI.

Ported from [bakapear/bcheck](https://github.com/bakapear/bcheck) (`src/bcheck.js`).

## Install

```bash
cd packages/engine-fast
npm install
npm run build
```

## API

```typescript
import { checkBounce, getBounceAngles, getVelFromAngle, LandType } from "@playground/engine-fast";

checkBounce(64, { vel: 500, crouched: false }, LandType.UNCROUCHED); // 2 = double bounce
getVelFromAngle(45, false, [12, 121]); // Stock launcher
```

## CLI

```bash
npm run build
node dist/cli.js quick 64 500 uncrouched
node dist/cli.js 64 default   # uses data/bounces.sample.json
```

Set `BCHECK_DATA` to point at a full bounce database JSON (from bcheck or generated data in v0.3.0).

## Tests

```bash
npm test
```

Golden tests assert parity with upstream `bcheck.js`.

## License

MIT (analytical core from bcheck, MIT)

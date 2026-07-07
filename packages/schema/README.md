# Schema — bounce setup binary format

Shared 92-byte setup record decoder for web and tooling.

## Build & test

```bash
cd packages/schema
npm install
python3 ../engine-sim/scripts/write_schema_fixture.py  # requires engine-sim on PYTHONPATH
npm test
```

## Record layout

See `packages/engine-sim/src/engine_sim/setups.py` (`Setup.pack`) and `src/decode.ts`.

## License

MIT

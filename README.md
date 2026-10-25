# Expansions

An iPad web app for practising expanding brackets at GCSE. Live at
https://git-hub-user-888.github.io/expansions/ — open it in Safari, tap Share → Add to Home Screen,
and always launch it from the home-screen icon (the icon and a Safari tab keep separate histories).

The spec is in [SPEC.md](SPEC.md).

## Run locally

```bash
npm run serve
```

Then open http://localhost:8123.

## Test

```bash
npm test
```

## Layout

- `js/poly.js`, `js/generator.js`, `js/marking.js`, `js/progress.js` — maths, marking and progress rules; no screen code, all tested.
- `js/app.js` — the four screens. `js/scratchpad.js` — the working area. `js/store.js` — saving, backup and restore.
- `sw.js` — offline support. Bump `CACHE` when the file list changes.
- `tools/make-icons.swift` — redraws the icons: `swift tools/make-icons.swift`.

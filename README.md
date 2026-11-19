# VICE GRID — GTA-Style Cover Maker

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Ahmadmukafi/gta6-cover-art-01-r2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Ahmadmukafi/gta6-cover-art-01-r2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

VICE GRID turns your photo and a caption into multi-panel GTA 6-style cover art, entirely offline in a desktop browser. No uploads, no network, no account.

## How it works

1. Drop photos in (or use the two built-in samples).
2. Pick a panel grid — Triple, Four Corners, Boulevard Strip, or Hero + Duo.
3. **Drag a panel onto another to swap them** — the VICE GRID remix. Pan mode drags the photo inside a panel; scroll zooms it.
4. Pick a look (Sunset Strip, Neon Night, Heat Wave) and slide the grade from golden hour to neon night.
5. Type your caption, then export a PNG in 1080×1080, 1080×1350, or 1920×1080.

The preview and the export share one render path (`app/src/cover.js`), so what you see is exactly what you get.

## Run it

Serve `app/` with any static server and open `index.html`:

```sh
node serve.ts   # from the kit, or: python3 -m http.server -d app
```

## Entry

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` via `vendor/makefun-app.ts`.

## License

MIT — see [LICENSE](LICENSE).

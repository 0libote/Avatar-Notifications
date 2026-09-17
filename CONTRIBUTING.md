# Contributing to NotifBuddy

Thanks for stopping by! Short version:

## Setup

- Node.js 20+, Rust stable (see [rustup.rs](https://rustup.rs)).
- Windows: WebView2 (ships with Win 10/11). Linux dev also needs
  `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`
  (the CI workflow lists the full set).

```bash
npm install
npm run dev          # vite only (UI preview, backend calls fall back gracefully)
npm run tauri dev    # full desktop app
```

## Checks before you push

```bash
npm run build            # strict tsc + vite bundle
cargo test -p notifbuddy # Rust unit tests
```

PRs run these in CI (`.github/workflows/ci.yml`).

## How beta releases work

Every push to `main` triggers `.github/workflows/beta-release.yml`:

1. Stamps version `0.1.<run_number>` into `package.json`,
   `tauri.conf.json`, `Cargo.toml` (repo itself stays at `0.1.0`).
2. Builds the Windows installers (NSIS `.exe` + MSI) on `windows-latest`.
3. Publishes them to the floating **`beta`** prerelease on GitHub Releases.
4. Updates `RELEASES.md` with the new version + download links
   (committed back as `[skip ci]` so it doesn't retrigger).

So: **merge to `main` = new beta**. Stable releases (e.g. `v0.2.0`) will be
cut from tags later — don't burn `0.1.x` numbers by hand.

## Conventions

- Frontend in `src/`, backend in `src-tauri/src/` — one topic per module,
  documented at the top of each file.
- Pixel art lives in `src/shared/buddies.ts` as 16-char rows; run the build
  (it typechecks) and eyeball any new buddy at 8x before merging.

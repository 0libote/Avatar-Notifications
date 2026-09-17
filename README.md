# NotifBuddy 💌

[![Beta release](https://github.com/0libote/Avatar-Notifications/actions/workflows/beta-release.yml/badge.svg)](https://github.com/0libote/Avatar-Notifications/actions/workflows/beta-release.yml)
[![CI](https://github.com/0libote/Avatar-Notifications/actions/workflows/ci.yml/badge.svg)](https://github.com/0libote/Avatar-Notifications/actions/workflows/ci.yml)

A cute pixel pal that sits on your screen and makes sure you never miss a
notification from the apps you care about (Outlook, Teams, Slack, …).

- **Lightweight** — Tauri v2 (Rust + WebView2), ~10 MB bundle, not 150 MB of Chromium.
- **Real Windows toasts** — reads the Windows notification history via the WinRT
  `UserNotificationListener` API and filters it to your watchlist.
- **One buddy at a time** — Mochi, Pixel, Puddles or Bolt. Drag it anywhere; it remembers.
- **Clean split** — `src/` (TypeScript UI) + `src-tauri/` (Rust backend), documented modules.

## ⬇️ Download (Windows beta)

No build needed: grab the latest installer from the
**[`beta` prerelease](https://github.com/0libote/Avatar-Notifications/releases/tag/beta)**
(`-setup.exe` recommended). Every push to `main` builds a fresh beta and
updates [`RELEASES.md`](./RELEASES.md) with the version + links.

## How it works

```
Windows toast history (WinRT) ──poll every 5s──▶ Rust watcher ──filter watchlist──▶ store
        ▲                                                                            │ emit
manual / test buttons ───────────────────────────────────────────────────────────────┘
                                                                                     ▼
                                              avatar overlay ◀── avatar.html + buddies.ts
                                              dashboard      ◀── index.html (inbox/settings)
```

- `src-tauri/src/watcher.rs` — background poller + WinRT reader (`windows` crate).
- `src-tauri/src/store.rs` — dedupe (same app+title+body within 10 min is ignored), cap 200.
- `src-tauri/src/commands.rs` — API the UI calls (`get_notifications`, `simulate_notification`, …).
- `src/shared/buddies.ts` — 4 hand-drawn 16×16 sprites (open + blink frames), canvas-rendered.
- `src/avatar.ts` — overlay: drag-to-move, click for dashboard, bubble + badge, snooze.
- `src/main.ts` — dashboard: inbox, watchlist, buddy picker, size/opacity/position.

## Run on Windows (today)

1. Install prerequisites:
   - [Node.js 20+](https://nodejs.org) (check `node --version`)
   - [Rust stable](https://rustup.rs) (check `cargo --version`)
   - WebView2 — already included in Windows 10/11.
2. Clone and start:
   ```powershell
   git clone https://github.com/0libote/Avatar-Notifications.git notifbuddy
   cd notifbuddy
   npm install
   npm run tauri dev
   ```
   Two windows appear: the **buddy** (drag it anywhere) and the **dashboard**.
3. Enable real toast reading:
   - Windows **Settings → Privacy & security → Notifications** → turn notifications **On**.
   - In the dashboard, **Windows listener → Request access**.
   - Add the apps you care about under **Watched apps** (e.g. `Outlook`, `Teams`).
4. Miss a toast? Your buddy bounces with a speech bubble like
   “2 new — Outlook (1) • Teams (1)”. Click the buddy to open the inbox.

## Build a Windows installer

```powershell
npm run tauri build
```

Produces `src-tauri/target/release/bundle/msi/NotifBuddy_0.1.0_x64_en-US.msi`
(and a portable `.exe` under `nsis/` if configured) — install and it autostarts
nothing; pin it yourself for now (startup toggle is on the roadmap).

## Develop on Linux

The OS listener is Windows-only; on Linux the app runs fine with
**Test** buttons (📧 Outlook email, 💬 Teams message, 💜 Slack ping),
which flow through the same store → event → avatar path.

```bash
npm install
npm run build        # typecheck + vite bundle
npm run tauri dev    # full desktop app (needs gtk/webkit dev libs)
```

## Tests

```bash
cargo test -p notifbuddy          # store dedupe, persistence, watchlist merge
npm run build                     # tsc --noEmit + vite (validates TS + art wiring)
```

## Roadmap (room to grow)

- Email fallback: IMAP unread polling for Gmail/Outlook when toasts are missed.
- Per-app buddy reactions, quiet hours / focus mode, notification history search.
- Launch-on-startup toggle, toast click-through to open the source app.
- More buddies + hats. Obviously hats.

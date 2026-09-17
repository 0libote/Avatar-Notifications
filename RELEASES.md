# Releases

## Beta channel (automatic)

Every push to `main` builds fresh Windows installers and publishes them to the
floating [**`beta` prerelease**](https://github.com/0libote/Avatar-Notifications/releases/tag/beta).
Beta versions look like `0.1.<run_number>` (plain numeric semver — the MSI
bundler requires it). The repo itself stays at `0.1.0`; the number is stamped
at build time by `scripts/stamp-version.mjs`.

<!-- BETA-START -->
## Latest beta — v0.1.3

- **Published:** 2026-09-17T09:57:21Z
- **Commit:** [165ae5b](https://github.com/0libote/Avatar-Notifications/commit/165ae5b10222c50136c50617703f599fd595c77e)
- **Build:** [actions run](https://github.com/0libote/Avatar-Notifications/actions/runs/35207351590)
- **Release page:** [beta prerelease](https://github.com/0libote/Avatar-Notifications/releases/tag/beta)

### Installers (Windows x64)

- [NotifBuddy_0.1.3_x64-setup.exe](https://github.com/0libote/Avatar-Notifications/releases/download/beta/NotifBuddy_0.1.3_x64-setup.exe)
- [NotifBuddy_0.1.3_x64_en-US.msi](https://github.com/0libote/Avatar-Notifications/releases/download/beta/NotifBuddy_0.1.3_x64_en-US.msi)

> SmartScreen may warn on first install (unsigned beta). Click "More info" → "Run anyway".
<!-- BETA-END -->

## Beta history

<!-- BETA-HISTORY-START -->
| Version | Date | Commit | Installer |
| ------- | ---- | ------ | --------- |
| v0.1.3 | 2026-09-17 | 165ae5b | [download](https://github.com/0libote/Avatar-Notifications/releases/download/beta/NotifBuddy_0.1.3_x64-setup.exe) |
<!-- BETA-HISTORY-END -->

## Stable releases

None yet. Stables will be cut from `v*` tags (e.g. `v0.2.0`) — coming soon.

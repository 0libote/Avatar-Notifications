# Releases

## Beta channel (automatic)

Every push to `main` builds fresh Windows installers and publishes them to the
floating [**`beta` prerelease**](https://github.com/0libote/Avatar-Notifications/releases/tag/beta).
Beta versions look like `0.1.<run_number>` (plain numeric semver — the MSI
bundler requires it). The repo itself stays at `0.1.0`; the number is stamped
at build time by `scripts/stamp-version.mjs`.

<!-- BETA-START -->

## Latest beta — not published yet

Push to `main` to trigger the first beta build
([workflow](https://github.com/0libote/Avatar-Notifications/actions/workflows/beta-release.yml)).

<!-- BETA-END -->

## Beta history

<!-- BETA-HISTORY-START -->
| Version | Date | Commit | Installer |
| ------- | ---- | ------ | --------- |
<!-- BETA-HISTORY-END -->

## Stable releases

None yet. Stables will be cut from `v*` tags (e.g. `v0.2.0`) — coming soon.

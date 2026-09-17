#!/usr/bin/env node
/**
 * Stamp a release version into every file that carries one.
 *
 * Usage: node scripts/stamp-version.mjs 0.1.42
 *
 * Updates (in place):
 *   - package.json                (version)
 *   - src-tauri/tauri.conf.json   (version)
 *   - src-tauri/Cargo.toml        ([package] version)
 *   - src-tauri/Cargo.lock        (notifbuddy package stanza, keeps the lockfile honest)
 *
 * Only plain `major.minor.patch` is accepted — the WiX/MSI bundler requires
 * numeric versions, so no `-beta` style prereleases here. The beta channel is
 * expressed as 0.1.<run_number> + the GitHub `beta` prerelease instead.
 */
import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error("usage: node scripts/stamp-version.mjs <major.minor.patch>");
  process.exit(1);
}

function patchJson(path, set) {
  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw);
  set(data);
  // Preserve the repo's 2-space style + trailing newline.
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  console.log(`stamped ${path}`);
}

patchJson("package.json", (d) => {
  d.version = version;
});
patchJson("src-tauri/tauri.conf.json", (d) => {
  d.version = version;
});

function patchCargoToml() {
  const path = "src-tauri/Cargo.toml";
  const raw = readFileSync(path, "utf8");
  let done = false;
  const out = raw.replace(
    /(\[package\][^\[]*?\nversion\s*=\s*")([^"]+)(")/,
    (_m, pre, _old, post) => {
      done = true;
      return `${pre}${version}${post}`;
    },
  );
  if (!done) {
    console.error("could not find [package] version in src-tauri/Cargo.toml");
    process.exit(1);
  }
  writeFileSync(path, out);
  console.log(`stamped ${path}`);
}

function patchCargoLock() {
  const path = "src-tauri/Cargo.lock";
  const raw = readFileSync(path, "utf8");
  const out = raw.replace(
    /(\[\[package\]\]\nname\s*=\s*"notifbuddy"\nversion\s*=\s*")[^"]+(")/,
    (_m, pre, post) => `${pre}${version}${post}`,
  );
  if (out === raw) {
    console.log(`no notifbuddy stanza in ${path}, skipping`);
    return;
  }
  writeFileSync(path, out);
  console.log(`stamped ${path}`);
}

patchCargoToml();
patchCargoLock();
console.log(`version stamped: ${version}`);

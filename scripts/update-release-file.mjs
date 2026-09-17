#!/usr/bin/env node
/**
 * Rewrite the "Latest beta" section of RELEASES.md after a beta build.
 *
 * Usage:
 *   node scripts/update-release-file.mjs \
 *     --repo 0libote/Avatar-Notifications --tag beta \
 *     --version 0.1.42 --sha <commit> --run <run_number> --date <iso> \
 *     [--out RELEASES.md]
 *
 * Installer filenames are discovered by globbing the Tauri bundle output
 * dirs, so renames in Tauri's naming scheme don't silently break the links:
 *   src-tauri/target/release/bundle/msi/*.msi
 *   src-tauri/target/release/bundle/nsis/*-setup.exe
 *
 * Everything between <!-- BETA-START --> / <!-- BETA-END --> is replaced,
 * and a row is prepended to the history table (capped at 10 rows).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}

const repo = arg("repo");
const tag = arg("tag", "beta");
const version = arg("version");
const sha = arg("sha", "");
const run = arg("run", "");
const date = arg("date", new Date().toISOString());
const outPath = arg("out", "RELEASES.md");

if (!repo || !version) {
  console.error("missing required --repo / --version");
  process.exit(1);
}

function listFiles(dir, suffix) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(suffix))
      .sort()
      .map((f) => join(dir, f).replace(/\\/g, "/"));
  } catch {
    return [];
  }
}

const installers = [
  ...listFiles("src-tauri/target/release/bundle/nsis", "-setup.exe"),
  ...listFiles("src-tauri/target/release/bundle/msi", ".msi"),
].map((p) => p.split("/").pop());

if (installers.length === 0) {
  console.error("no installers found under src-tauri/target/release/bundle");
  process.exit(1);
}

const base = `https://github.com/${repo}/releases/download/${tag}`;
const links = installers
  .map((f) => `- [${f}](${base}/${f})`)
  .join("\n");
const shortSha = sha ? sha.slice(0, 7) : "unknown";

const section = [
  `## Latest beta — v${version}`,
  ``,
  `- **Published:** ${date}`,
  `- **Commit:** ${sha ? `[${shortSha}](https://github.com/${repo}/commit/${sha})` : "unknown"}`,
  run ? `- **Build:** [actions run](https://github.com/${repo}/actions/runs/${run})` : null,
  `- **Release page:** [${tag} prerelease](https://github.com/${repo}/releases/tag/${tag})`,
  ``,
  `### Installers (Windows x64)`,
  ``,
  links,
  ``,
  `> SmartScreen may warn on first install (unsigned beta). Click "More info" → "Run anyway".`,
].filter((l) => l !== null).join("\n");

function replaceBetween(text, start, end, replacement) {
  const si = text.indexOf(start);
  const ei = text.indexOf(end);
  if (si === -1 || ei === -1 || ei < si) {
    console.error(`markers ${start} / ${end} not found in ${outPath}`);
    process.exit(1);
  }
  return (
    text.slice(0, si + start.length) + "\n" + replacement + "\n" + text.slice(ei)
  );
}

let md = readFileSync(outPath, "utf8");
md = replaceBetween(md, "<!-- BETA-START -->", "<!-- BETA-END -->", section);

// History table: prepend newest row, cap at 10 data rows.
const row = `| v${version} | ${date.slice(0, 10)} | ${shortSha} | [download](${base}/${installers[0]}) |`;
const hStart = "<!-- BETA-HISTORY-START -->";
const hEnd = "<!-- BETA-HISTORY-END -->";
{
  const si = md.indexOf(hStart);
  const ei = md.indexOf(hEnd);
  if (si === -1 || ei === -1) {
    console.error("history markers not found");
    process.exit(1);
  }
  const head = md.slice(0, si + hStart.length);
  const tail = md.slice(ei);
  const body = md.slice(si + hStart.length, ei);
  const lines = body.split("\n");
  const headerIdx = lines.findIndex((l) => l.startsWith("| Version"));
  const header = lines.slice(0, headerIdx + 2).join("\n");
  const dataRows = lines
    .slice(headerIdx + 2)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"))
    .filter((l) => !l.includes(`v${version} `) && !l.includes(`| v${version} |`));
  const kept = [row, ...dataRows].slice(0, 10);
  md = `${head}\n${header.trim()}\n${kept.join("\n")}\n${tail}`;
}

writeFileSync(outPath, md);
console.log(`updated ${outPath} → v${version} (${installers.length} installers)`);

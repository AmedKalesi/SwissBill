#!/usr/bin/env node
/**
 * One-shot environment setup for the SwissBill monorepo.
 *
 * Verifies the Node version, locates a working pnpm (bypassing a broken
 * corepack shim when necessary) and runs `pnpm install`. Safe to re-run.
 *
 *   node scripts/setup.mjs
 *   # or, once pnpm is available:
 *   pnpm setup
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIN_NODE_MAJOR = 20;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function info(message) {
  console.log(`• ${message}`);
}

// 1. Node version check.
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
if (Number.isNaN(nodeMajor) || nodeMajor < MIN_NODE_MAJOR) {
  fail(
    `Node.js >= ${MIN_NODE_MAJOR} required, found ${process.versions.node}. ` +
      "Install a newer Node from https://nodejs.org and retry.",
  );
}
info(`Node.js ${process.versions.node} detected`);

// 2. Locate a working pnpm entrypoint.
function resolvePnpm() {
  // Prefer the globally installed pnpm next to the running Node binary.
  const globalEntry = join(
    dirname(process.execPath),
    "..",
    "lib",
    "node_modules",
    "pnpm",
    "bin",
    "pnpm.mjs",
  );
  if (existsSync(globalEntry)) {
    return { command: process.execPath, args: [globalEntry] };
  }

  // Fall back to a pnpm on PATH (may be a corepack shim).
  const probe = spawnSync("pnpm", ["--version"], { encoding: "utf8" });
  if (probe.status === 0) {
    return { command: "pnpm", args: [] };
  }

  return null;
}

const pnpm = resolvePnpm();
if (!pnpm) {
  fail(
    "pnpm not found. Install it with `npm install -g pnpm@12.8.1` " +
      "or use the bundled wrapper: ./scripts/pnpm install",
  );
}
const version = spawnSync(pnpm.command, [...pnpm.args, "--version"], {
  encoding: "utf8",
});
info(`pnpm ${version.stdout.trim()} detected`);

// 3. Install dependencies.
info("Installing workspace dependencies…");
const install = spawnSync(pnpm.command, [...pnpm.args, "install"], {
  cwd: root,
  stdio: "inherit",
});
if (install.status !== 0) {
  fail("`pnpm install` failed. See the output above for details.");
}

console.log("\n✔ Setup complete. Next steps:");
console.log("  1. cp .env.example .env   (then fill in the values)");
console.log("  2. ./scripts/pnpm db:generate");
console.log("  3. ./scripts/pnpm db:migrate");
console.log("  4. ./scripts/pnpm dev\n");

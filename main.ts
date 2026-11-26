// The 3AM Commit Message — entrypoint.
// Writes the one-line commit confession to /output/entry.txt and proves it landed intact.
// Node 22, plain TypeScript, no dependencies.

import { chmodSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const OUTPUT_PATH = "/output/entry.txt";

// The line itself. This is the entire payload — keep it byte-stable.
const LINE =
  "fix: the bug was me. the fix is also me. we have reached an understanding";

function fail(message: string): never {
  throw new Error(`entry gate: ${message}`);
}

function checkLine(candidate: string): void {
  // Rulebook gate: UTF-8, 1–139 characters, exactly one line, not blank.
  const points = Array.from(candidate);
  if (points.length < 1 || points.length > 139) {
    fail(`length ${points.length} outside 1..139 code points`);
  }
  if (candidate.trim().length === 0) {
    fail("line is blank");
  }
  if (candidate.includes("\n") || candidate.includes("\r")) {
    fail("line must not contain a newline or carriage return");
  }
  if (candidate !== candidate.trim()) {
    fail("line must not start or end with whitespace");
  }
}

function publishAtomically(target: string, text: string): void {
  // Write to a sibling temp file, then rename over the target so a reader
  // never observes a half-written entry.
  mkdirSync(dirname(target), { recursive: true });
  const staging = `${target}.tmp`;
  writeFileSync(staging, text, { encoding: "utf8", mode: 0o644 });
  chmodSync(staging, 0o644);
  renameSync(staging, target);
  chmodSync(target, 0o644);
}

function verifyOnDisk(target: string, expected: string): void {
  const landed = readFileSync(target, "utf8");
  if (landed !== expected) {
    fail("read-back does not match the intended line byte for byte");
  }
  // No trailing newline may sneak in: on-disk size must equal the UTF-8
  // byte length of the line exactly, nothing more.
  const wantBytes = Buffer.byteLength(expected, "utf8");
  const gotBytes = statSync(target).size;
  if (gotBytes !== wantBytes) {
    fail(`on-disk size ${gotBytes} bytes, expected ${wantBytes} bytes`);
  }
  // Published file must be world-readable 0644, matching the write mode.
  const mode = statSync(target).mode & 0o777;
  if (mode !== 0o644) {
    fail(`on-disk mode 0${mode.toString(8)}, expected 0644`);
  }
}

checkLine(LINE);
publishAtomically(OUTPUT_PATH, LINE);
verifyOnDisk(OUTPUT_PATH, LINE);

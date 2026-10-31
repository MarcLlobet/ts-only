import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { findJavaScript, suggestion } from "./ts-only.ts";

const repo = (files: Record<string, string>, untracked: string[] = []) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-"));
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), content);
  }
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["add", "-A"], { cwd: dir });
  for (const file of untracked) fs.writeFileSync(path.join(dir, file), "");
  return dir;
};

const inRepo = <T>(dir: string, fn: () => T): T => {
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(cwd);
  }
};

const project = () =>
  repo(
    {
      ".tsonlyignore": "legacy/*\n!legacy/keep.js\n*.config.mjs\n",
      "src/.tsonlyignore": "old/\n",
      "a.js": "",
      "b.ts": "",
      "legacy/x.js": "",
      "legacy/keep.js": "",
      "src/c.jsx": "",
      "src/old/d.js": "",
      "src/vite.config.mjs": "",
    },
    ["untracked.js"],
  );

test("finds tracked JavaScript, honouring .tsonlyignore like .gitignore", () => {
  const dir = project();
  assert.deepEqual(
    inRepo(dir, () => findJavaScript()),
    ["a.js", "legacy/keep.js", "src/c.jsx"],
  );
  assert.deepEqual(
    inRepo(dir, () => findJavaScript("src")),
    ["src/c.jsx"],
  );
  assert.deepEqual(
    inRepo(dir, () => findJavaScript("a.js")),
    ["a.js"],
  );
});

test("explains a missing path or a folder outside git", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-"));
  assert.throws(
    () => inRepo(dir, () => findJavaScript("nope")),
    /does not exist/,
  );
  assert.throws(
    () => inRepo(dir, () => findJavaScript()),
    /not inside a git repository/,
  );
});

test("suggests the TypeScript file name", () => {
  assert.match(suggestion("src/app.jsx"), /^Rename it to app\.tsx,/);
  assert.match(suggestion("vite.config.mjs"), /vite\.config\.mts/);
});

const run = (script: string, args: string[], cwd: string, env = {}) =>
  spawnSync(
    "node",
    [fileURLToPath(new URL(script, import.meta.url)), ...args],
    {
      cwd,
      encoding: "utf8",
      env: { ...process.env, ...env },
    },
  );

test("the CLI takes an optional path and exits with 1 when JavaScript is found", () => {
  const dir = project();
  const all = run("./cli.ts", [], dir);
  assert.equal(all.status, 1);
  assert.match(all.stderr, /3 JavaScript files found/);
  assert.match(all.stderr, /a\.js: Rename it to a\.ts/);

  assert.equal(run("./cli.ts", ["src/old"], dir).status, 0);
  assert.equal(run("./cli.ts", ["missing"], dir).status, 2);
});

test("the Action annotates each file and writes the outputs", () => {
  const dir = project();
  const output = path.join(dir, ".output");
  const result = run("./action.ts", [], dir, {
    INPUT_PATH: "src",
    GITHUB_OUTPUT: output,
  });
  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /^::error file=src\/c\.jsx,title=JavaScript file::/m,
  );
  assert.equal(
    fs.readFileSync(output, "utf8"),
    'count=1\nfiles=["src/c.jsx"]\n',
  );
});

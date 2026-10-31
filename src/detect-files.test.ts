import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { detectFiles, filterFiles } from "./detect-files.ts";

const createRepo = (files: Record<string, string>): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-"));
  execFileSync("git", ["init", "-q", dir]);
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), content);
  }
  return dir;
};

test("detectFiles finds JavaScript and skips what .gitignore ignores", () => {
  const dir = createRepo({
    ".gitignore": "node_modules\nbuild\n",
    "a.js": "",
    "b.ts": "",
    "src/c.mjs": "",
    "src/node_modules/d.js": "",
    "build/e.js": "",
    "legacy/f.js": "",
  });

  assert.deepEqual(
    detectFiles(dir, ["legacy"]).map((file) => path.relative(dir, file)),
    ["a.js", "src/c.mjs"],
  );
});

test("detectFiles explains when there is no git repository", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-"));
  assert.throws(() => detectFiles(dir, []), /not inside a git repository/);
});

test("filterFiles keeps JavaScript inside the path that is not excluded", () => {
  assert.deepEqual(
    filterFiles(["web/a.js", "web/b.ts", "web/old/c.js", "api/d.js"], "web", [
      "old",
    ]),
    ["web/a.js"],
  );
});

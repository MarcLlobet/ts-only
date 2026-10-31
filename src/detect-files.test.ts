import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { getConfig } from "./config.ts";
import { detectFiles, filterFiles } from "./detect-files.ts";

const config = getConfig({ exclude: ["legacy"] });

test("detectFiles finds JavaScript and skips excluded folders at any depth", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-"));
  for (const file of [
    "a.js",
    "b.ts",
    "src/c.mjs",
    "src/node_modules/d.js",
    "legacy/e.js",
    "src/distance.js",
  ]) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), "");
  }

  assert.deepEqual(
    detectFiles(dir, config).map((file) => path.relative(dir, file)),
    ["a.js", "src/c.mjs", "src/distance.js"],
  );
});

test("filterFiles keeps JavaScript inside the path that is not excluded", () => {
  assert.deepEqual(
    filterFiles(
      ["web/a.js", "web/b.ts", "web/node_modules/c.js", "api/d.js"],
      "web",
      config,
    ),
    ["web/a.js"],
  );
});

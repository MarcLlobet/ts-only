import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadExclude, suggestion } from "./config.ts";

test("loadExclude reads .ts-onlyrc.json, then package.json", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-"));
  assert.deepEqual(loadExclude(dir), []);

  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ "ts-only": { exclude: ["a"] } }),
  );
  assert.deepEqual(loadExclude(dir), ["a"]);

  fs.writeFileSync(
    path.join(dir, ".ts-onlyrc.json"),
    JSON.stringify({ exclude: ["b"] }),
  );
  assert.deepEqual(loadExclude(dir), ["b"]);
});

test("suggestion names the TypeScript file", () => {
  assert.match(suggestion("src/app.jsx"), /^Rename it to app\.tsx,/);
  assert.match(suggestion("vite.config.mjs"), /vite\.config\.mts/);
});

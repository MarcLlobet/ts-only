import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { getConfig, loadConfigFile } from "./config.ts";

test("getConfig uses the defaults", () => {
  assert.deepEqual(getConfig(), {
    exclude: ["node_modules", "dist", ".git"],
    files: [".js", ".jsx", ".mjs", ".cjs"],
  });
});

test("getConfig adds excludes and lets inputs replace extensions", () => {
  assert.deepEqual(
    getConfig(
      { exclude: ["coverage"], extensions: [".jsx"] },
      { exclude: ["legacy", "dist"], extensions: ["js"] },
    ),
    {
      exclude: ["node_modules", "dist", ".git", "legacy", "coverage"],
      files: [".jsx"],
    },
  );
});

test("loadConfigFile reads .ts-onlyrc.json, then package.json", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-"));
  assert.deepEqual(loadConfigFile(dir), {});

  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ "ts-only": { exclude: ["a"] } }),
  );
  assert.deepEqual(loadConfigFile(dir), { exclude: ["a"] });

  fs.writeFileSync(
    path.join(dir, ".ts-onlyrc.json"),
    JSON.stringify({ exclude: ["b"] }),
  );
  assert.deepEqual(loadConfigFile(dir), { exclude: ["b"] });
});

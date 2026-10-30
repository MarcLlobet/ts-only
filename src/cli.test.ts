import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("./cli.ts", import.meta.url));

test("the CLI exits with 1 only when JavaScript files exist", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-"));
  fs.writeFileSync(path.join(dir, "a.ts"), "");
  assert.equal(spawnSync("node", [cli], { cwd: dir }).status, 0);

  fs.writeFileSync(path.join(dir, "b.js"), "");
  assert.equal(spawnSync("node", [cli], { cwd: dir }).status, 1);
});

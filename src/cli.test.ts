import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("./cli.ts", import.meta.url));
const run = (cwd: string) =>
  spawnSync("node", [cli], { cwd, encoding: "utf8" });

test("the CLI exits with 1 only when JavaScript files exist", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-"));
  execFileSync("git", ["init", "-q", dir]);
  fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules\n");
  fs.mkdirSync(path.join(dir, "node_modules"));
  fs.writeFileSync(path.join(dir, "node_modules/x.js"), "");
  assert.equal(run(dir).status, 0);

  fs.writeFileSync(path.join(dir, "b.js"), "");
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /b\.js: Rename it to b\.ts/);

  fs.writeFileSync(
    path.join(dir, ".ts-onlyrc.json"),
    JSON.stringify({ exclude: ["b.js"] }),
  );
  assert.equal(run(dir).status, 0);
});

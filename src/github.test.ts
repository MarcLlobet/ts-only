import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mock, test } from "node:test";
import { annotation, getChangedFiles, readInputs } from "./github.ts";

test("readInputs reads the action inputs with defaults", () => {
  assert.deepEqual(readInputs({}), {
    path: ".",
    exclude: [],
    fail: true,
    scope: "all",
    token: "",
  });
  assert.deepEqual(
    readInputs({ INPUT_EXCLUDE: "a, b\nc", INPUT_FAIL: "false" }).exclude,
    ["a", "b", "c"],
  );
});

test("annotation points at the file and suggests the fix", () => {
  assert.equal(
    annotation("src/app.jsx", true),
    '::error file=src/app.jsx,title=JavaScript file::src/app.jsx is JavaScript. Rename it to app.tsx, or add it to "exclude" if it has to stay JavaScript.',
  );
});

const files = [
  { filename: "new.js", status: "added" },
  { filename: "old.js", status: "modified" },
  { filename: "gone.js", status: "removed" },
];

const run = async (event: object, scope: "changed" | "added") => {
  const eventPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-")),
    "event.json",
  );
  fs.writeFileSync(eventPath, JSON.stringify(event));
  const fetch = mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ("pull_request" in event ? files : { files }),
  }));
  const result = await getChangedFiles(
    { GITHUB_EVENT_PATH: eventPath, GITHUB_REPOSITORY: "o/r" },
    "token",
    scope,
  );
  const url = String(fetch.mock.calls[0]?.arguments[0]);
  fetch.mock.restore();
  return { result, url };
};

test("getChangedFiles reads the pull request files", async () => {
  const { result, url } = await run({ pull_request: { number: 7 } }, "added");
  assert.deepEqual(result, ["new.js"]);
  assert.match(url, /\/repos\/o\/r\/pulls\/7\/files/);
});

test("getChangedFiles compares a new branch with the default branch", async () => {
  const { result, url } = await run(
    { before: "0000000", after: "abc", repository: { default_branch: "main" } },
    "changed",
  );
  assert.deepEqual(result, ["new.js", "old.js"]);
  assert.match(url, /\/compare\/main\.\.\.abc$/);
});

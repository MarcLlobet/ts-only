import assert from "node:assert/strict";
import { test } from "node:test";
import { addToChangelog, parseLog, releaseNotes } from "./release.ts";

const log = [
  "aaaaaaaaaa\tpatch: Fix excludes (#3)",
  "bbbbbbbbbb\tadd preview",
  "cccccccccc\tMinor: Add scope",
].join("\n");

test("releaseNotes groups prefixed commits and links them", () => {
  assert.equal(
    releaseNotes(parseLog(log, "o/r")),
    [
      "### Features",
      "",
      "- Add scope ([ccccccc](https://github.com/o/r/commit/cccccccccc))",
      "",
      "### Fixes",
      "",
      "- Fix excludes ([#3](https://github.com/o/r/pull/3))",
      "",
    ].join("\n"),
  );
});

test("addToChangelog puts the newest release first", () => {
  const first = addToChangelog("", "## v1.0.1", "- a\n");
  assert.equal(first, "# Changelog\n\n## v1.0.1\n\n- a\n");
  assert.equal(
    addToChangelog(first, "## v1.1.0", "- b\n"),
    "# Changelog\n\n## v1.1.0\n\n- b\n\n## v1.0.1\n\n- a\n",
  );
});

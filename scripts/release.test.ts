import assert from "node:assert/strict";
import { test } from "node:test";
import { addToChangelog, parseLog, releaseNotes } from "./release.ts";

const log = [
  "aaaaaaaaaa\x1fpatch: Fix excludes (#3)\x1f",
  "bbbbbbbbbb\x1fadd preview\x1f",
  "cccccccccc\x1fMinor: Add scope\x1f",
  "dddddddddd\x1fMerge pull request #5 from me/branch\x1fmajor: Drop Node 18\n",
].join("\x1e\n");

test("releaseNotes groups prefixed squash and merge commits", () => {
  assert.equal(
    releaseNotes(parseLog(log, "o/r")),
    [
      "### Breaking changes",
      "",
      "- Drop Node 18 ([#5](https://github.com/o/r/pull/5))",
      "",
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

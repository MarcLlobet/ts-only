import {
  highestBump,
  nextVersion,
  parseCommit,
  prependChangelog,
  releaseNotes,
  type Change,
} from "./release.ts";

describe("parseCommit", () => {
  it("reads the bump, the title and the pull request", () => {
    expect(parseCommit("minor: Add scope input (#12)", "abc")).toEqual({
      bump: "minor",
      title: "Add scope input",
      pullRequest: 12,
      sha: "abc",
    });
  });

  it("accepts any case and commits without a pull request", () => {
    expect(parseCommit("Patch: fix typo", "abc")).toEqual({
      bump: "patch",
      title: "fix typo",
      pullRequest: undefined,
      sha: "abc",
    });
  });

  it("ignores commits without a release prefix", () => {
    expect(parseCommit("feat: something", "abc")).toBeUndefined();
    expect(parseCommit("release: v1.1.0", "abc")).toBeUndefined();
    expect(parseCommit("Bump jest from 29 to 30", "abc")).toBeUndefined();
  });
});

const change = (
  bump: Change["bump"],
  title: string,
  pullRequest?: number,
): Change => ({
  bump,
  title,
  pullRequest,
  sha: "0123456789abcdef",
});

describe("highestBump", () => {
  it("picks the biggest change", () => {
    expect(highestBump([change("patch", "a"), change("minor", "b")])).toBe(
      "minor",
    );
    expect(highestBump([change("major", "a"), change("patch", "b")])).toBe(
      "major",
    );
  });

  it("returns undefined when there is nothing to release", () => {
    expect(highestBump([])).toBeUndefined();
  });
});

describe("nextVersion", () => {
  it("bumps each part and resets the lower ones", () => {
    expect(nextVersion("v1.2.3", "patch")).toBe("1.2.4");
    expect(nextVersion("v1.2.3", "minor")).toBe("1.3.0");
    expect(nextVersion("1.2.3", "major")).toBe("2.0.0");
  });
});

describe("releaseNotes", () => {
  it("groups changes from major to patch and links them", () => {
    expect(
      releaseNotes(
        [
          change("patch", "Fix excludes", 3),
          change("minor", "Add scope", 1),
          change("patch", "Typo"),
        ],
        "MarcLlobet/ts-only",
      ),
    ).toBe(
      [
        "### Features",
        "",
        "- Add scope ([#1](https://github.com/MarcLlobet/ts-only/pull/1))",
        "",
        "### Fixes",
        "",
        "- Fix excludes ([#3](https://github.com/MarcLlobet/ts-only/pull/3))",
        "- Typo ([0123456](https://github.com/MarcLlobet/ts-only/commit/0123456789abcdef))",
        "",
      ].join("\n"),
    );
  });
});

describe("prependChangelog", () => {
  const notes = "### Fixes\n\n- Typo\n";

  it("creates the changelog", () => {
    expect(prependChangelog("", "1.0.1", "2026-10-30", notes)).toBe(
      "# Changelog\n\n## v1.0.1 (2026-10-30)\n\n### Fixes\n\n- Typo\n",
    );
  });

  it("puts the newest release first", () => {
    const existing = "# Changelog\n\n## v1.0.0 (2026-01-01)\n\n- Init\n";
    expect(prependChangelog(existing, "1.0.1", "2026-10-30", notes)).toBe(
      "# Changelog\n\n## v1.0.1 (2026-10-30)\n\n### Fixes\n\n- Typo\n\n## v1.0.0 (2026-01-01)\n\n- Init\n",
    );
  });
});

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

type Bump = "major" | "minor" | "patch";
type Change = { bump: Bump; line: string };

const BUMPS: Bump[] = ["major", "minor", "patch"];
const HEADINGS = {
  major: "Breaking changes",
  minor: "Features",
  patch: "Fixes",
};

export const parseLog = (log: string, repo: string): Change[] =>
  log.split("\x1e").flatMap((entry) => {
    const [sha = "", subject = "", body = ""] = entry.trim().split("\x1f");
    const merge = subject.match(/^Merge pull request #(\d+)/);
    const message = merge
      ? `${body.trim().split("\n")[0]} (#${merge[1]})`
      : subject;
    const match = message.match(
      /^(patch|minor|major):\s*(.+?)(?:\s*\(#(\d+)\))?$/i,
    );
    if (!match) return [];
    const [, bump, title, pr] = match;
    const link = pr
      ? `[#${pr}](https://github.com/${repo}/pull/${pr})`
      : `[${sha.slice(0, 7)}](https://github.com/${repo}/commit/${sha})`;
    return [{ bump: bump.toLowerCase() as Bump, line: `- ${title} (${link})` }];
  });

export const releaseNotes = (changes: Change[]): string =>
  BUMPS.map((bump) => changes.filter((change) => change.bump === bump))
    .filter((group) => group.length)
    .map(
      (group) =>
        `### ${HEADINGS[group[0].bump]}\n\n${group.map((c) => c.line).join("\n")}\n`,
    )
    .join("\n");

export const addToChangelog = (
  changelog: string,
  heading: string,
  notes: string,
): string => {
  const previous = changelog.replace(/^# Changelog\n+/, "");
  return `# Changelog\n\n${heading}\n\n${notes}${previous ? `\n${previous}` : ""}`;
};

if (process.argv[1]?.endsWith("release.ts")) {
  const sh = (...args: string[]) =>
    execFileSync(args[0], args.slice(1), { encoding: "utf8" }).trim();
  const tag = sh(
    "git",
    "describe",
    "--tags",
    "--abbrev=0",
    "--match",
    "v*.*.*",
  );
  const repo = process.env.GITHUB_REPOSITORY ?? "MarcLlobet/ts-only";
  const changes = parseLog(
    sh(
      "git",
      "log",
      "--first-parent",
      "--reverse",
      "--format=%H%x1f%s%x1f%b%x1e",
      `${tag}..HEAD`,
    ),
    repo,
  );
  const bump = BUMPS.find((b) => changes.some((change) => change.bump === b));
  let output = "release=false";

  if (bump) {
    const version = sh("npm", "version", bump, "--no-git-tag-version");
    const notes = releaseNotes(changes);
    const changelog = fs.existsSync("CHANGELOG.md")
      ? fs.readFileSync("CHANGELOG.md", "utf8")
      : "";
    const date = new Date().toISOString().slice(0, 10);
    fs.writeFileSync("release-notes.md", notes);
    fs.writeFileSync(
      "CHANGELOG.md",
      addToChangelog(changelog, `## ${version} (${date})`, notes),
    );
    output = `release=true\ntag=${version}\nmajor=${version.split(".")[0]}`;
  }

  console.log(output);
  if (process.env.GITHUB_OUTPUT)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
}

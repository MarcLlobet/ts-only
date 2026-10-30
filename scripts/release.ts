import { execFileSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

export type Bump = "patch" | "minor" | "major";

export interface Change {
  bump: Bump;
  title: string;
  pullRequest?: number;
  sha: string;
}

const ORDER: Bump[] = ["patch", "minor", "major"];
const PREFIX = /^(patch|minor|major):\s*(.+)$/i;
const PULL_REQUEST = /\s*\(#(\d+)\)\s*$/;

export const parseCommit = (
  subject: string,
  sha: string,
): Change | undefined => {
  const match = subject.trim().match(PREFIX);
  if (!match) return undefined;
  const [, bump, rest] = match;
  const pr = rest.match(PULL_REQUEST);
  return {
    bump: bump.toLowerCase() as Bump,
    title: rest.replace(PULL_REQUEST, "").trim(),
    pullRequest: pr ? Number(pr[1]) : undefined,
    sha,
  };
};

export const highestBump = (changes: Change[]): Bump | undefined =>
  changes.reduce<Bump | undefined>(
    (highest, { bump }) =>
      !highest || ORDER.indexOf(bump) > ORDER.indexOf(highest) ? bump : highest,
    undefined,
  );

export const nextVersion = (current: string, bump: Bump): string => {
  const [major, minor, patch] = current
    .replace(/^v/, "")
    .split(".")
    .map(Number);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

const HEADINGS: Record<Bump, string> = {
  major: "Breaking changes",
  minor: "Features",
  patch: "Fixes",
};

export const releaseNotes = (changes: Change[], repository: string): string =>
  [...ORDER]
    .reverse()
    .map((bump) => {
      const items = changes.filter((change) => change.bump === bump);
      if (!items.length) return "";
      const lines = items.map(({ title, pullRequest, sha }) => {
        const link = pullRequest
          ? `[#${pullRequest}](https://github.com/${repository}/pull/${pullRequest})`
          : `[${sha.slice(0, 7)}](https://github.com/${repository}/commit/${sha})`;
        return `- ${title} (${link})`;
      });
      return `### ${HEADINGS[bump]}\n\n${lines.join("\n")}\n`;
    })
    .filter(Boolean)
    .join("\n");

export const CHANGELOG_TITLE = "# Changelog\n";

export const prependChangelog = (
  changelog: string,
  version: string,
  date: string,
  notes: string,
): string => {
  const body = changelog.startsWith(CHANGELOG_TITLE)
    ? changelog.slice(CHANGELOG_TITLE.length).replace(/^\n+/, "")
    : changelog;
  const entry = `## v${version} (${date})\n\n${notes}`;
  return `${CHANGELOG_TITLE}\n${entry}${body ? `\n${body}` : ""}`;
};

const git = (...args: string[]): string =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

const latestTag = (): string | undefined =>
  git("tag", "--list", "v*.*.*", "--sort=-v:refname").split("\n").find(Boolean);

const commitsSince = (tag: string | undefined): Change[] => {
  const range = tag ? [`${tag}..HEAD`] : ["HEAD"];
  const log = git("log", "--format=%H%x09%s", ...range);
  return log
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, ...subject] = line.split("\t");
      return parseCommit(subject.join("\t"), sha);
    })
    .filter((change): change is Change => Boolean(change))
    .reverse();
};

const setVersion = (file: string, version: string): void => {
  if (!fs.existsSync(file)) return;
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  json.version = version;
  if (json.packages?.[""]) json.packages[""].version = version;
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
};

const output = (values: Record<string, string>): void => {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
  }
  console.log(lines.join("\n"));
};

const main = (): void => {
  const repository = process.env.GITHUB_REPOSITORY ?? "MarcLlobet/ts-only";
  const tag = latestTag();
  const changes = commitsSince(tag);
  const bump = highestBump(changes);

  if (!bump) {
    console.log(
      `No patch:, minor: or major: commits since ${tag ?? "the start"}.`,
    );
    output({ release: "false" });
    return;
  }

  const version = nextVersion(tag ?? "v0.0.0", bump);
  const notes = releaseNotes(changes, repository);
  const date = new Date().toISOString().slice(0, 10);

  fs.writeFileSync("release-notes.md", notes);
  const changelog = fs.existsSync("CHANGELOG.md")
    ? fs.readFileSync("CHANGELOG.md", "utf8")
    : "";
  fs.writeFileSync(
    "CHANGELOG.md",
    prependChangelog(changelog, version, date, notes),
  );
  setVersion("package.json", version);
  setVersion("package-lock.json", version);

  output({
    release: "true",
    version,
    tag: `v${version}`,
    major: `v${version.split(".")[0]}`,
  });
};

if (process.argv[1]?.endsWith("release.ts")) {
  main();
}

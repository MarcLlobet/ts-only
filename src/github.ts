import fs from "node:fs";
import { suggestion } from "./config.ts";

export type Scope = "all" | "changed" | "added";
type Env = Record<string, string | undefined>;
type ChangedFile = { filename: string; status: string };

const input = (env: Env, name: string, fallback = ""): string =>
  env[`INPUT_${name.toUpperCase()}`]?.trim() || fallback;

const list = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const readInputs = (env: Env) => ({
  path: input(env, "path", "."),
  exclude: list(input(env, "exclude")),
  fail: input(env, "fail", "true") !== "false",
  scope: input(env, "scope", "all") as Scope,
  token: input(env, "token"),
});

export const annotation = (file: string, fail: boolean): string =>
  `::${fail ? "error" : "warning"} file=${file.replace(/[%,:]/g, encodeURIComponent)},title=JavaScript file::${file} is JavaScript. ${suggestion(file)}`;

export const summary = (files: string[]): string =>
  files.length
    ? [
        "## ts-only",
        "",
        `🚨 ${files.length} JavaScript file${files.length === 1 ? "" : "s"} found`,
        "",
        "| File | Fix |",
        "| --- | --- |",
        ...files.map((file) => `| \`${file}\` | ${suggestion(file)} |`),
        "",
      ].join("\n")
    : "## ts-only\n\n✅ No JavaScript files found\n";

const api = async (env: Env, token: string, route: string) => {
  const url = `${env.GITHUB_API_URL ?? "https://api.github.com"}/repos/${env.GITHUB_REPOSITORY}${route}`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${route} answered ${response.status}`);
  }
  return response.json();
};

export const getChangedFiles = async (
  env: Env,
  token: string,
  scope: Scope,
): Promise<string[] | undefined> => {
  const event = env.GITHUB_EVENT_PATH
    ? JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8"))
    : {};
  let files: ChangedFile[] = [];

  if (event.pull_request) {
    for (let page = 1; ; page++) {
      const batch: ChangedFile[] = await api(
        env,
        token,
        `/pulls/${event.pull_request.number}/files?per_page=100&page=${page}`,
      );
      files.push(...batch);
      if (batch.length < 100) break;
    }
  } else if (event.after) {
    const base = /^0+$/.test(event.before)
      ? event.repository?.default_branch
      : event.before;
    files = (await api(env, token, `/compare/${base}...${event.after}`)).files;
  } else {
    return undefined;
  }

  return files
    .filter(
      ({ status }) =>
        status !== "removed" &&
        (scope === "changed" || status === "added" || status === "renamed"),
    )
    .map((file) => file.filename);
};

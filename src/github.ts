import fs from "node:fs";
import path from "node:path";

export type StatusState = "pending" | "success" | "failure" | "error";
export type Scope = "all" | "changed" | "added";

const SCOPES: Scope[] = ["all", "changed", "added"];

export interface ActionInputs {
  path: string;
  extensions: string[];
  exclude: string[];
  fail: boolean;
  scope: Scope;
  commitStatus: boolean;
  statusContext: string;
  token: string;
}

type Env = Record<string, string | undefined>;

export const parseList = (value = ""): string[] =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const getInput = (env: Env, name: string, fallback = ""): string =>
  env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`]?.trim() || fallback;

const readScope = (value: string): Scope => {
  if (!SCOPES.includes(value as Scope)) {
    throw new Error(
      `"scope" must be one of ${SCOPES.join(", ")}, got "${value}"`,
    );
  }
  return value as Scope;
};

export const readInputs = (env: Env): ActionInputs => ({
  path: getInput(env, "path", "."),
  extensions: parseList(getInput(env, "extensions")),
  exclude: parseList(getInput(env, "exclude")),
  fail: getInput(env, "fail", "true") !== "false",
  scope: readScope(getInput(env, "scope", "all")),
  commitStatus: getInput(env, "commit-status", "false") === "true",
  statusContext: getInput(env, "status-context", "ts-only"),
  token: getInput(env, "token"),
});

const escapeData = (value: string): string =>
  value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

const escapeProperty = (value: string): string =>
  escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");

const TS_EXTENSION: Record<string, string> = {
  ".js": ".ts",
  ".jsx": ".tsx",
  ".mjs": ".mts",
  ".cjs": ".cts",
};

export const suggestion = (file: string): string => {
  const extension = path.extname(file);
  const target = TS_EXTENSION[extension];
  const rename = target
    ? `Rename it to ${path.basename(file, extension)}${target}`
    : "Convert it to TypeScript";
  return `${rename}, or add it to "exclude" if it has to stay JavaScript.`;
};

export const annotation = (file: string, fail: boolean): string =>
  `::${fail ? "error" : "warning"} file=${escapeProperty(file)},title=${escapeProperty("JavaScript file")}::${escapeData(
    `${file} is JavaScript. ${suggestion(file)}`,
  )}`;

export const statusDescription = (count: number): string =>
  count === 0
    ? "No JavaScript files found"
    : `${count} JavaScript file${count === 1 ? "" : "s"} found`;

const SCOPE_LABEL: Record<Scope, string> = {
  all: "in the whole repository",
  changed: "among the changed files",
  added: "among the added files",
};

export const summary = (
  files: string[],
  extensions: string[],
  scope: Scope = "all",
): string => {
  const lines = [
    "## ts-only",
    "",
    `${files.length ? "🚨" : "✅"} ${statusDescription(files.length)} ${SCOPE_LABEL[scope]} (checked ${extensions.join(", ")})`,
  ];
  if (files.length) {
    lines.push(
      "",
      "| File | Fix |",
      "| --- | --- |",
      ...files.map((f) => `| \`${f}\` | ${suggestion(f)} |`),
    );
  }
  return `${lines.join("\n")}\n`;
};

export const writeOutputs = (
  env: Env,
  files: string[],
  scope: Scope = "all",
): void => {
  if (!env.GITHUB_OUTPUT) return;
  const delimiter = `ts_only_${Date.now()}`;
  fs.appendFileSync(
    env.GITHUB_OUTPUT,
    `count=${files.length}\nscope=${scope}\nfiles<<${delimiter}\n${JSON.stringify(files)}\n${delimiter}\n`,
  );
};

export const writeSummary = (env: Env, markdown: string): void => {
  if (env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(env.GITHUB_STEP_SUMMARY, markdown);
  }
};

export const resolveSha = (env: Env): string | undefined => {
  if (env.GITHUB_EVENT_PATH && fs.existsSync(env.GITHUB_EVENT_PATH)) {
    const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
    const headSha = event.pull_request?.head?.sha;
    if (headSha) return headSha;
  }
  return env.GITHUB_SHA;
};

type EventPayload = {
  pull_request?: { number: number; head?: { sha?: string } };
  before?: string;
  after?: string;
  repository?: { default_branch?: string };
};

const readEvent = (env: Env): EventPayload => {
  if (!env.GITHUB_EVENT_PATH || !fs.existsSync(env.GITHUB_EVENT_PATH))
    return {};
  return JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
};

type ChangedFile = { filename: string; status: string };

const NULL_SHA = /^0+$/;

const githubGet = async (
  env: Env,
  token: string,
  route: string,
): Promise<unknown> => {
  const api = env.GITHUB_API_URL ?? "https://api.github.com";
  const response = await fetch(`${api}${route}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${route} answered ${response.status}`);
  }
  return response.json();
};

const keep = (scope: Scope, { status }: ChangedFile): boolean =>
  status !== "removed" &&
  (scope === "changed" || status === "added" || status === "renamed");

export const getChangedFiles = async (
  env: Env,
  token: string,
  scope: Exclude<Scope, "all">,
): Promise<string[] | undefined> => {
  const event = readEvent(env);
  const repo = env.GITHUB_REPOSITORY;
  if (!repo || !token) return undefined;

  let files: ChangedFile[];
  if (event.pull_request) {
    files = [];
    for (let page = 1; page <= 30; page++) {
      const batch = (await githubGet(
        env,
        token,
        `/repos/${repo}/pulls/${event.pull_request.number}/files?per_page=100&page=${page}`,
      )) as ChangedFile[];
      files.push(...batch);
      if (batch.length < 100) break;
    }
  } else if (event.after && event.before) {
    const base = NULL_SHA.test(event.before)
      ? event.repository?.default_branch
      : event.before;
    if (!base) return undefined;
    const comparison = (await githubGet(
      env,
      token,
      `/repos/${repo}/compare/${base}...${event.after}`,
    )) as { files?: ChangedFile[] };
    files = comparison.files ?? [];
  } else {
    return undefined;
  }

  return files.filter((file) => keep(scope, file)).map((file) => file.filename);
};

export const runUrl = (env: Env): string | undefined =>
  env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
    : undefined;

export const postStatus = async (
  env: Env,
  inputs: ActionInputs,
  state: StatusState,
  description: string,
): Promise<void> => {
  const sha = resolveSha(env);
  if (!sha || !env.GITHUB_REPOSITORY || !inputs.token) {
    console.log("::warning::ts-only could not post a commit status");
    return;
  }
  const api = env.GITHUB_API_URL ?? "https://api.github.com";
  const response = await fetch(
    `${api}/repos/${env.GITHUB_REPOSITORY}/statuses/${sha}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${inputs.token}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        state,
        context: inputs.statusContext,
        description,
        target_url: runUrl(env),
      }),
    },
  );
  if (!response.ok) {
    console.log(
      `::warning::ts-only could not post a commit status (${response.status}). Does the job have "statuses: write" permission?`,
    );
  }
};

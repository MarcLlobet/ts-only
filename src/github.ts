import fs from "node:fs";

export type StatusState = "pending" | "success" | "failure" | "error";

export interface ActionInputs {
  path: string;
  extensions: string[];
  exclude: string[];
  fail: boolean;
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

export const readInputs = (env: Env): ActionInputs => ({
  path: getInput(env, "path", "."),
  extensions: parseList(getInput(env, "extensions")),
  exclude: parseList(getInput(env, "exclude")),
  fail: getInput(env, "fail", "true") !== "false",
  commitStatus: getInput(env, "commit-status", "false") === "true",
  statusContext: getInput(env, "status-context", "ts-only"),
  token: getInput(env, "token"),
});

const escapeData = (value: string): string =>
  value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

const escapeProperty = (value: string): string =>
  escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");

export const annotation = (file: string, fail: boolean): string =>
  `::${fail ? "error" : "warning"} file=${escapeProperty(file)},title=${escapeProperty("JavaScript file")}::${escapeData(
    `${file} is JavaScript. This repository only allows TypeScript.`,
  )}`;

export const statusDescription = (count: number): string =>
  count === 0
    ? "No JavaScript files found"
    : `${count} JavaScript file${count === 1 ? "" : "s"} found`;

export const summary = (files: string[], extensions: string[]): string => {
  const lines = [
    "## ts-only",
    "",
    `${files.length ? "🚨" : "✅"} ${statusDescription(files.length)} (checked ${extensions.join(", ")})`,
  ];
  if (files.length) {
    lines.push("", "| File |", "| --- |", ...files.map((f) => `| \`${f}\` |`));
  }
  return `${lines.join("\n")}\n`;
};

export const writeOutputs = (env: Env, files: string[]): void => {
  if (!env.GITHUB_OUTPUT) return;
  const delimiter = `ts_only_${Date.now()}`;
  fs.appendFileSync(
    env.GITHUB_OUTPUT,
    `count=${files.length}\nfiles<<${delimiter}\n${JSON.stringify(files)}\n${delimiter}\n`,
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

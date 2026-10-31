import fs from "node:fs";
import process from "node:process";
import { loadExclude } from "./config.ts";
import { detectFiles, filterFiles } from "./detect-files.ts";
import { annotation, getChangedFiles, readInputs, summary } from "./github.ts";

const env = process.env;

try {
  const inputs = readInputs(env);
  if (!["all", "changed", "added"].includes(inputs.scope)) {
    throw new Error(`"scope" must be all, changed or added`);
  }

  const exclude = [...loadExclude("."), ...inputs.exclude];
  const changed =
    inputs.scope === "all"
      ? undefined
      : await getChangedFiles(env, inputs.token, inputs.scope);
  if (inputs.scope !== "all" && !changed) {
    console.log(
      "::warning title=ts-only::No diff on this event, checking every file.",
    );
  }

  const files = changed
    ? filterFiles(changed, inputs.path, exclude)
    : detectFiles(inputs.path, exclude);

  files.forEach((file) => console.log(annotation(file, inputs.fail)));
  if (env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      env.GITHUB_OUTPUT,
      `count=${files.length}\nfiles=${JSON.stringify(files)}\n`,
    );
  }
  if (env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(env.GITHUB_STEP_SUMMARY, summary(files));
  }
  if (files.length && inputs.fail) process.exitCode = 1;
} catch (error) {
  console.log(`::error title=ts-only::${(error as Error).message}`);
  process.exitCode = 1;
}

import process from "node:process";
import { getConfig, loadConfigFile } from "./config.ts";
import { detectFiles, filterFiles } from "./detect-files.ts";
import {
  annotation,
  getChangedFiles,
  postStatus,
  readInputs,
  statusDescription,
  summary,
  writeOutputs,
  writeSummary,
  type ActionInputs,
  type Scope,
} from "./github.ts";

const env = process.env;

const findFiles = async (
  inputs: ActionInputs,
): Promise<{ files: string[]; scope: Scope; extensions: string[] }> => {
  const config = getConfig(
    { exclude: inputs.exclude, extensions: inputs.extensions },
    loadConfigFile("."),
  );

  if (inputs.scope !== "all") {
    const changed = await getChangedFiles(env, inputs.token, inputs.scope);
    if (changed) {
      return {
        files: filterFiles(changed, inputs.path, config),
        scope: inputs.scope,
        extensions: config.files,
      };
    }
    console.log(
      `::warning title=ts-only::scope "${inputs.scope}" needs a pull_request or push event with a previous commit; checking every file instead.`,
    );
  }

  return {
    files: detectFiles(inputs.path, config),
    scope: "all",
    extensions: config.files,
  };
};

const run = async (): Promise<void> => {
  let inputs: ActionInputs | undefined;

  try {
    inputs = readInputs(env);

    if (inputs.commitStatus) {
      await postStatus(env, inputs, "pending", "Looking for JavaScript files…");
    }

    const { files, scope, extensions } = await findFiles(inputs);
    const description = statusDescription(files.length);

    files.forEach((file) => console.log(annotation(file, inputs!.fail)));
    console.log(files.length ? `🚨 ${description}` : `✅ ${description}`);

    writeOutputs(env, files, scope);
    writeSummary(env, summary(files, extensions, scope));

    if (inputs.commitStatus) {
      await postStatus(
        env,
        inputs,
        files.length ? "failure" : "success",
        description,
      );
    }

    if (files.length && inputs.fail) {
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`::error title=ts-only::${message}`);
    if (inputs?.commitStatus) {
      await postStatus(env, inputs, "error", message.slice(0, 140));
    }
    process.exitCode = 1;
  }
};

run();

import process from "node:process";
import { getConfig } from "./config.ts";
import { detectFiles } from "./detect-files.ts";
import {
  annotation,
  postStatus,
  readInputs,
  statusDescription,
  summary,
  writeOutputs,
  writeSummary,
} from "./github.ts";

const run = async (): Promise<void> => {
  const env = process.env;
  const inputs = readInputs(env);

  if (inputs.commitStatus) {
    await postStatus(env, inputs, "pending", "Looking for JavaScript files…");
  }

  try {
    const config = getConfig({
      exclude: inputs.exclude,
      extensions: inputs.extensions,
    });
    const files = detectFiles(inputs.path, config);
    const description = statusDescription(files.length);

    files.forEach((file) => console.log(annotation(file, inputs.fail)));
    console.log(files.length ? `🚨 ${description}` : `✅ ${description}`);

    writeOutputs(env, files);
    writeSummary(env, summary(files, config.files));

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
    if (inputs.commitStatus) {
      await postStatus(env, inputs, "error", message.slice(0, 140));
    }
    process.exitCode = 1;
  }
};

run();

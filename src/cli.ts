#!/usr/bin/env node

import process from "node:process";
import { getConfig, loadConfigFile } from "./config.ts";
import { detectFiles } from "./detect-files.ts";
import { getPrompt } from "./getPrompt.ts";

export type { Config } from "./config.ts";

export const tsOnly = (): void => {
  const props = getConfig({}, loadConfigFile("."));
  const files = detectFiles("./", props);

  getPrompt(files, props);

  process.exitCode = files.length ? 1 : 0;
};

(() => {
  tsOnly();
})();

#!/usr/bin/env node

import process from "node:process";
import { getConfig } from "./config";
import { detectFiles } from "./detect-files";
import { getPrompt } from "./getPrompt";

export type { Config } from "./config";

export const tsOnly = (): void => {
  const props = getConfig();
  const files = detectFiles("./", props);

  getPrompt(files, props);

  process.exitCode = files.length ? 1 : 0;
};

(() => {
  tsOnly();
})();

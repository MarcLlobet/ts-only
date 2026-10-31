#!/usr/bin/env node

import process from "node:process";
import { loadExclude, suggestion } from "./config.ts";
import { detectFiles } from "./detect-files.ts";

try {
  const files = detectFiles(".", loadExclude("."));
  if (files.length) {
    console.error(
      `🚨 ${files.length} JavaScript file${files.length === 1 ? "" : "s"} found:`,
    );
    files.forEach((file) => console.error(`  ${file}: ${suggestion(file)}`));
    process.exitCode = 1;
  } else {
    console.info("✅ No JavaScript files found.");
  }
} catch (error) {
  console.error(`ts-only: ${(error as Error).message}`);
  process.exitCode = 2;
}

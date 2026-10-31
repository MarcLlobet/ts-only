#!/usr/bin/env node

import process from "node:process";
import { findJavaScript, suggestion } from "./ts-only.ts";

try {
  const files = findJavaScript(process.argv[2]);
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

import fs from "node:fs";
import process from "node:process";
import { findJavaScript, suggestion } from "./ts-only.ts";

const { GITHUB_OUTPUT, GITHUB_STEP_SUMMARY, INPUT_PATH } = process.env;

try {
  const files = findJavaScript(INPUT_PATH?.trim() || ".");
  const escape = (file: string) => file.replace(/[%,:]/g, encodeURIComponent);

  for (const file of files) {
    console.log(
      `::error file=${escape(file)},title=JavaScript file::${file} is JavaScript. ${suggestion(file)}`,
    );
  }
  if (GITHUB_OUTPUT) {
    fs.appendFileSync(
      GITHUB_OUTPUT,
      `count=${files.length}\nfiles=${JSON.stringify(files)}\n`,
    );
  }
  if (GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      GITHUB_STEP_SUMMARY,
      files.length
        ? `## ts-only\n\n🚨 ${files.length} JavaScript file${files.length === 1 ? "" : "s"} found\n\n| File | Fix |\n| --- | --- |\n${files.map((file) => `| \`${file}\` | ${suggestion(file)} |`).join("\n")}\n`
        : "## ts-only\n\n✅ No JavaScript files found\n",
    );
  }
  if (files.length) process.exitCode = 1;
} catch (error) {
  console.log(`::error title=ts-only::${(error as Error).message}`);
  process.exitCode = 1;
}

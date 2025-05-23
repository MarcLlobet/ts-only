import type { Config } from "./config";
import console from "node:console";

export const getPrompt = (files: string[], props: Config): void => {
  console.info(`Excluded: `, props.exclude);
  console.info(`Files: `, props.files);

  if (!files.length) {
    console.info(`✅ Success! No files have been found.`);
    return;
  }

  console.error(
    `🚨 ${files.length} file${files.length === 1 ? "" : "s"} ha${files.length === 1 ? "s" : "ve"} been found:`,
  );
  console.group();
  files.forEach((file) => console.log(`- ${file}`));
  console.groupEnd();
};

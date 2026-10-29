import { getConfig, loadConfigFile, type ConfigOptions } from "./config.ts";
import { detectFiles } from "./detect-files.ts";

export {
  getConfig,
  loadConfigFile,
  CONFIG_FILE,
  DEFAULT_EXCLUDE,
  DEFAULT_EXTENSIONS,
} from "./config.ts";
export type { Config, ConfigOptions } from "./config.ts";
export { detectFiles, filterFiles } from "./detect-files.ts";

export const findJavaScriptFiles = (
  directory = ".",
  options: ConfigOptions = {},
): string[] =>
  detectFiles(directory, getConfig(options, loadConfigFile(directory)));

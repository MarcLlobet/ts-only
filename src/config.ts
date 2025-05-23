export interface Config {
  exclude: string[];
  files: string[];
}

const defaultConfig: Config = {
  exclude: ["node_modules", "dist"],
  files: ["js", "jsx"],
} as const;

export const getConfig = (): Config => {
  const {exclude, files: defaultFiles} = defaultConfig;
  const files = defaultFiles.map((ext) => `.${ext}`)
  return {
    exclude,
    files,
  };
};

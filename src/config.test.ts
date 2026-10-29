import { getConfig } from "./config.ts";

describe("getConfig", () => {
  it("returns the defaults", () => {
    expect(getConfig()).toEqual({
      exclude: ["node_modules", "dist", ".git"],
      files: [".js", ".jsx", ".mjs", ".cjs"],
    });
  });

  it("adds extra excludes to the defaults without duplicates", () => {
    expect(getConfig({ exclude: ["coverage", "dist"] }).exclude).toEqual([
      "node_modules",
      "dist",
      ".git",
      "coverage",
    ]);
  });

  it("replaces the extensions and accepts them with or without a dot", () => {
    expect(getConfig({ extensions: ["js", ".vue"] }).files).toEqual([
      ".js",
      ".vue",
    ]);
  });
});

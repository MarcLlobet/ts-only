import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getConfig, loadConfigFile } from "./config.ts";

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

describe("getConfig with a config file", () => {
  it("adds the file's excludes and uses its extensions", () => {
    expect(getConfig({}, { exclude: ["legacy"], extensions: ["js"] })).toEqual({
      exclude: ["node_modules", "dist", ".git", "legacy"],
      files: [".js"],
    });
  });

  it("lets inputs override the file's extensions and add excludes", () => {
    expect(
      getConfig(
        { exclude: ["coverage"], extensions: ["jsx"] },
        { exclude: ["legacy"], extensions: ["js"] },
      ),
    ).toEqual({
      exclude: ["node_modules", "dist", ".git", "legacy", "coverage"],
      files: [".jsx"],
    });
  });
});

describe("loadConfigFile", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-config-"));
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("returns nothing when there is no config", () => {
    expect(loadConfigFile(dir)).toEqual({});
  });

  it("reads .ts-onlyrc.json first", () => {
    fs.writeFileSync(
      path.join(dir, ".ts-onlyrc.json"),
      JSON.stringify({ exclude: ["legacy"] }),
    );
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ "ts-only": { exclude: ["ignored"] } }),
    );
    expect(loadConfigFile(dir)).toEqual({
      exclude: ["legacy"],
      extensions: undefined,
    });
  });

  it("reads the ts-only key in package.json", () => {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "app", "ts-only": { extensions: ["js"] } }),
    );
    expect(loadConfigFile(dir)).toEqual({
      exclude: undefined,
      extensions: ["js"],
    });
  });

  it("explains an invalid config", () => {
    fs.writeFileSync(
      path.join(dir, ".ts-onlyrc.json"),
      JSON.stringify({ exclude: "legacy" }),
    );
    expect(() => loadConfigFile(dir)).toThrow(
      '"exclude" in .ts-onlyrc.json must be an array of strings',
    );
  });
});

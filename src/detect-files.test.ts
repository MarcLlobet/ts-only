import fs from "node:fs";
import { detectFiles, filterFiles, isExcluded } from "./detect-files.ts";

describe("detectFiles", () => {
  let testDir: string;

  beforeAll(() => {
    testDir = fs.mkdtempSync("detect-files-test-");
    fs.writeFileSync(`${testDir}/file1.js`, "");
    fs.writeFileSync(`${testDir}/file2.ts`, "");
    fs.mkdirSync(`${testDir}/subdir`);
    fs.writeFileSync(`${testDir}/subdir/file3.js`, "");
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should detect files with allowed extensions", () => {
    const props = {
      exclude: [],
      files: [".js"],
    };
    const result = detectFiles(testDir, props);

    expect(result).toEqual(
      expect.arrayContaining([
        `${testDir}/file1.js`,
        `${testDir}/subdir/file3.js`,
      ]),
    );
  });

  it("should exclude directories listed in the exclude array", () => {
    const props = {
      exclude: [`${testDir}/subdir`],
      files: [".js"],
    };
    const result = detectFiles(testDir, props);

    expect(result).toEqual([`${testDir}/file1.js`]);
  });

  it("should handle empty directories gracefully", () => {
    const emptyDir = `${testDir}/empty`;
    fs.mkdirSync(emptyDir);

    const props = {
      exclude: [],
      files: [".js"],
    };
    const result = detectFiles(emptyDir, props);

    expect(result).toEqual([]);
  });

  it("should not include files with unsupported extensions", () => {
    fs.writeFileSync(`${testDir}/file4.txt`, "");

    const props = {
      exclude: [],
      files: [".js"],
    };
    const result = detectFiles(testDir, props);

    expect(result).not.toContain(`${testDir}/file4.txt`);
  });

  it("skips excluded directory names at any depth", () => {
    fs.mkdirSync(`${testDir}/subdir/node_modules/pkg`, { recursive: true });
    fs.writeFileSync(`${testDir}/subdir/node_modules/pkg/index.js`, "");

    const result = detectFiles(testDir, {
      exclude: ["node_modules"],
      files: [".js"],
    });

    expect(result).toEqual([
      `${testDir}/file1.js`,
      `${testDir}/subdir/file3.js`,
    ]);
  });
});

describe("filterFiles", () => {
  const config = {
    exclude: ["node_modules", "dist", "legacy/vendor"],
    files: [".js", ".mjs"],
  };

  it("keeps JavaScript files inside the path that are not excluded", () => {
    expect(
      filterFiles(
        [
          "src/a.js",
          "src/b.ts",
          "packages/x/node_modules/y.js",
          "legacy/vendor/z.js",
          "legacy/c.mjs",
        ],
        ".",
        config,
      ),
    ).toEqual(["legacy/c.mjs", "src/a.js"]);
  });

  it("only keeps files under the given path", () => {
    expect(
      filterFiles(["apps/web/a.js", "apps/api/b.js"], "apps/web", config),
    ).toEqual(["apps/web/a.js"]);
  });
});

describe("isExcluded", () => {
  it("matches whole folder names, not prefixes", () => {
    expect(isExcluded("src/distance.js", ["dist"])).toBe(false);
    expect(isExcluded("packages/a/dist/b.js", ["dist"])).toBe(true);
  });
});

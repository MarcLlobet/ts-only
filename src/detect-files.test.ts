import fs from "node:fs";
import { detectFiles } from "./detect-files.ts";

describe("detectFiles", () => {
  const testDir = "test-dir";

  beforeAll(() => {
    fs.mkdirSync(testDir);
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

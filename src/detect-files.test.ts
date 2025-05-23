import { mkdirSync, writeFileSync, rmSync } from "fs";
import { detectFiles } from "./detect-files";

describe("detectFiles", () => {
  const testDir = "test-dir";

  beforeAll(() => {
    mkdirSync(testDir);
    writeFileSync(`${testDir}/file1.js`, "");
    writeFileSync(`${testDir}/file2.ts`, "");
    mkdirSync(`${testDir}/subdir`);
    writeFileSync(`${testDir}/subdir/file3.js`, "");
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
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
    mkdirSync(emptyDir);

    const props = {
      exclude: [],
      files: [".js"],
    };
    const result = detectFiles(emptyDir, props);

    expect(result).toEqual([]);
  });

  it("should not include files with unsupported extensions", () => {
    writeFileSync(`${testDir}/file4.txt`, "");

    const props = {
      exclude: [],
      files: [".js"],
    };
    const result = detectFiles(testDir, props);

    expect(result).not.toContain(`${testDir}/file4.txt`);
  });
});

import fs from "node:fs";
const mockExitCode = jest.fn();

jest.mock("node:process", () => ({
  __esModule: true,
  default: {
    set exitCode(x: number) {
      mockExitCode(x);
    },
  },
}));

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

describe("tsOnly", () => {
  it("runs as an iife", () => {
    const process = require("node:process").default;
    
    require("./cli");
    
    process.exitCode = 99;
    expect(mockExitCode).toHaveBeenCalledWith(99);
  });
});
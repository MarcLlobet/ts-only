import { getPrompt } from "./getPrompt";
import console from "node:console";

describe("getPrompt", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should log success message when no files are found", () => {
    getPrompt([], { exclude: [], files: [] });
    expect(console.info).toHaveBeenCalledWith(
      "✅ Success! No files have been found.",
    );
  });

  it("should log error message and exit when files are found", () => {
    getPrompt(["file1.js", "file2.js"], { exclude: [], files: [] });
    expect(console.error).toHaveBeenCalledWith("🚨 2 files have been found:");
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  annotation,
  parseList,
  readInputs,
  resolveSha,
  statusDescription,
  summary,
  writeOutputs,
} from "./github.ts";

describe("parseList", () => {
  it("splits on commas and new lines and trims", () => {
    expect(parseList(" js, jsx\nmjs ,, ")).toEqual(["js", "jsx", "mjs"]);
  });
});

describe("readInputs", () => {
  it("uses defaults when inputs are empty", () => {
    expect(readInputs({})).toEqual({
      path: ".",
      extensions: [],
      exclude: [],
      fail: true,
      commitStatus: false,
      statusContext: "ts-only",
      token: "",
    });
  });

  it("reads the action inputs from the environment", () => {
    const inputs = readInputs({
      INPUT_PATH: "packages/app",
      INPUT_EXTENSIONS: "js, jsx",
      INPUT_EXCLUDE: "coverage\nstorybook-static",
      INPUT_FAIL: "false",
      "INPUT_COMMIT-STATUS": "true",
      "INPUT_STATUS-CONTEXT": "typescript only",
      INPUT_TOKEN: "secret",
    });
    expect(inputs).toEqual({
      path: "packages/app",
      extensions: ["js", "jsx"],
      exclude: ["coverage", "storybook-static"],
      fail: false,
      commitStatus: true,
      statusContext: "typescript only",
      token: "secret",
    });
  });
});

describe("annotation", () => {
  it("is an error that points at the file", () => {
    expect(annotation("src/a.js", true)).toBe(
      "::error file=src/a.js,title=JavaScript file::src/a.js is JavaScript. This repository only allows TypeScript.",
    );
  });

  it("is a warning in report-only mode and escapes special characters", () => {
    expect(annotation("a,b:c.js", false)).toMatch(
      /^::warning file=a%2Cb%3Ac\.js,/,
    );
  });
});

describe("statusDescription", () => {
  it("handles singular and plural", () => {
    expect(statusDescription(0)).toBe("No JavaScript files found");
    expect(statusDescription(1)).toBe("1 JavaScript file found");
    expect(statusDescription(3)).toBe("3 JavaScript files found");
  });
});

describe("summary", () => {
  it("lists the files in a table", () => {
    const markdown = summary(["a.js"], [".js"]);
    expect(markdown).toContain("1 JavaScript file found (checked .js)");
    expect(markdown).toContain("| `a.js` |");
  });
});

describe("GitHub files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-"));

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("writes count and files outputs", () => {
    const output = path.join(dir, "output");
    fs.writeFileSync(output, "");
    writeOutputs({ GITHUB_OUTPUT: output }, ["a.js", "b.js"]);
    const content = fs.readFileSync(output, "utf8");
    expect(content).toMatch(/^count=2\n/);
    expect(content).toContain('["a.js","b.js"]');
  });

  it("uses the pull request head commit for the status", () => {
    const event = path.join(dir, "event.json");
    fs.writeFileSync(
      event,
      JSON.stringify({ pull_request: { head: { sha: "head-sha" } } }),
    );
    expect(resolveSha({ GITHUB_EVENT_PATH: event, GITHUB_SHA: "merge" })).toBe(
      "head-sha",
    );
  });

  it("falls back to GITHUB_SHA outside pull requests", () => {
    expect(resolveSha({ GITHUB_SHA: "push-sha" })).toBe("push-sha");
  });
});

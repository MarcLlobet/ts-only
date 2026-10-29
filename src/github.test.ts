import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  annotation,
  getChangedFiles,
  suggestion,
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
      scope: "all",
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
      INPUT_SCOPE: "added",
      "INPUT_COMMIT-STATUS": "true",
      "INPUT_STATUS-CONTEXT": "typescript only",
      INPUT_TOKEN: "secret",
    });
    expect(inputs).toEqual({
      path: "packages/app",
      extensions: ["js", "jsx"],
      exclude: ["coverage", "storybook-static"],
      fail: false,
      scope: "added",
      commitStatus: true,
      statusContext: "typescript only",
      token: "secret",
    });
  });
});

describe("readInputs scope", () => {
  it("rejects an unknown scope", () => {
    expect(() => readInputs({ INPUT_SCOPE: "new" })).toThrow(
      '"scope" must be one of all, changed, added, got "new"',
    );
  });
});

describe("suggestion", () => {
  it("suggests the matching TypeScript extension", () => {
    expect(suggestion("src/app.jsx")).toBe(
      'Rename it to app.tsx, or add it to "exclude" if it has to stay JavaScript.',
    );
    expect(suggestion("vite.config.mjs")).toContain("vite.config.mts");
    expect(suggestion("legacy.cjs")).toContain("legacy.cts");
  });
});

describe("annotation", () => {
  it("is an error that points at the file and suggests a fix", () => {
    expect(annotation("src/a.js", true)).toBe(
      '::error file=src/a.js,title=JavaScript file::src/a.js is JavaScript. Rename it to a.ts, or add it to "exclude" if it has to stay JavaScript.',
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
    expect(markdown).toContain(
      "1 JavaScript file found in the whole repository (checked .js)",
    );
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
    expect(content).toMatch(/^count=2\nscope=all\n/);
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

describe("getChangedFiles", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-only-event-"));
  const eventPath = path.join(dir, "event.json");
  const writeEvent = (event: object) =>
    fs.writeFileSync(eventPath, JSON.stringify(event));
  const env = {
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_REPOSITORY: "owner/repo",
    GITHUB_API_URL: "https://api.test",
  };
  const files = [
    { filename: "src/new.js", status: "added" },
    { filename: "src/old.js", status: "modified" },
    { filename: "src/moved.js", status: "renamed" },
    { filename: "src/gone.js", status: "removed" },
  ];
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const respond = (body: unknown) =>
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => body });

  it("reads the pull request files and keeps added ones", async () => {
    writeEvent({ pull_request: { number: 7 } });
    respond(files);
    await expect(getChangedFiles(env, "token", "added")).resolves.toEqual([
      "src/new.js",
      "src/moved.js",
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.test/repos/owner/repo/pulls/7/files?per_page=100&page=1",
    );
  });

  it("keeps modified files too with scope changed", async () => {
    writeEvent({ pull_request: { number: 7 } });
    respond(files);
    await expect(getChangedFiles(env, "token", "changed")).resolves.toEqual([
      "src/new.js",
      "src/old.js",
      "src/moved.js",
    ]);
  });

  it("compares the pushed commits", async () => {
    writeEvent({ before: "aaa", after: "bbb" });
    respond({ files });
    await getChangedFiles(env, "token", "added");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.test/repos/owner/repo/compare/aaa...bbb",
    );
  });

  it("compares a new branch with the default branch", async () => {
    writeEvent({
      before: "0000000000000000000000000000000000000000",
      after: "bbb",
      repository: { default_branch: "main" },
    });
    respond({ files });
    await getChangedFiles(env, "token", "added");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.test/repos/owner/repo/compare/main...bbb",
    );
  });

  it("returns undefined when the event has no diff", async () => {
    writeEvent({});
    await expect(
      getChangedFiles(env, "token", "added"),
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

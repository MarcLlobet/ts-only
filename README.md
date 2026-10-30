# ts-only

**TypeScript-only projects, zero JS allowed!**

ts-only fails when JavaScript files (`.js`, `.jsx`, `.mjs`, `.cjs`) appear in a repository that should be TypeScript-only. Use it as a **GitHub Action**, as a **required check** on pull requests, or as a **CLI** in hooks and scripts.

The Action is written in TypeScript and has no dependencies. Node 24 runs `src/action.ts` directly, with nothing to install or build, so the check takes about a second.

---

## 🚀 GitHub Action

```yaml
name: Checks

on:
  pull_request:
  push:
    branches: [main]

jobs:
  ts-only:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: MarcLlobet/ts-only@v1
```

When JavaScript files are found, the step fails and every file gets an annotation on the pull request's **Files changed** tab, with the fix: for example, "Rename it to `app.tsx`". The job summary lists them all, and the outputs are available to later steps.

### Inputs

| Input            | Default               | Description                                                                                                     |
| ---------------- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `path`           | `.`                   | Directory to scan, relative to the repository root.                                                             |
| `extensions`     | `js, jsx, mjs, cjs`   | Extensions that count as JavaScript, separated by commas or new lines. Replaces the config file's list.         |
| `exclude`        |                       | Extra directory names or paths to skip. `node_modules`, `dist` and `.git` are always skipped, at any depth.     |
| `fail`           | `true`                | Set to `false` to only report the files as warnings without failing.                                            |
| `scope`          | `all`                 | `all` scans the repository, `changed` checks files added or modified by the PR or push, `added` only new files. |
| `commit-status`  | `false`               | Also post a commit status linked to the run (see below). Needs `statuses: write`.                               |
| `status-context` | `ts-only`             | Name of that commit status.                                                                                     |
| `token`          | `${{ github.token }}` | Token used to read the changed files and post the commit status.                                                |

### Outputs

| Output  | Description                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------- |
| `count` | Number of JavaScript files found.                                                                         |
| `files` | JSON array with the paths of the files found.                                                             |
| `scope` | Scope actually used: `all` when `changed` or `added` had nothing to compare, e.g. on `workflow_dispatch`. |

### Config file

The CLI and the Action read the same config, so a pre-commit hook and CI never disagree. Add a `.ts-onlyrc.json` at the repository root:

```json
{
  "exclude": ["scripts/legacy", "public/vendor"],
  "extensions": ["js", "jsx", "mjs", "cjs"]
}
```

Or a `"ts-only"` key in `package.json`. Both fields are optional. Excludes from the file and from the `exclude` input are combined; the `extensions` input replaces the file's list.

### Examples

Report without failing:

```yaml
- uses: MarcLlobet/ts-only@v1
  with:
    fail: false
```

Check one package of a monorepo and skip generated code:

```yaml
- uses: MarcLlobet/ts-only@v1
  with:
    path: packages/web
    exclude: storybook-static, coverage
```

Use the result in a later step:

```yaml
- id: ts-only
  uses: MarcLlobet/ts-only@v1
  with:
    fail: false
- if: steps.ts-only.outputs.count != '0'
  run: echo "Still to migrate: ${{ steps.ts-only.outputs.files }}"
```

---

## 🧭 Adopting it in a JavaScript codebase

You don't need to convert everything before turning ts-only on:

1. **Stop new JavaScript today.** Use `scope: added`: pull requests fail only when they add a `.js` file, so editing existing JavaScript keeps working.

   ```yaml
   permissions:
     contents: read
     pull-requests: read
   steps:
     - uses: actions/checkout@v6
     - uses: MarcLlobet/ts-only@v1
       with:
         scope: added
   ```

2. **Track what is left.** A second step with `fail: false` and the default `scope: all` lists the remaining files in the job summary on every run.
3. **Exclude what must stay JavaScript** (generated code, vendored libraries) in `.ts-onlyrc.json`.
4. **Switch to `scope: all`** once the list is empty, so the repository stays TypeScript-only.

`scope: changed` sits in between: it also flags JavaScript files that a pull request modifies, nudging people to convert files as they touch them.

`changed` and `added` read the diff from the GitHub API: the files of a pull request, the commits of a push, or the difference from the default branch when a new branch is pushed. They need `pull-requests: read` on pull requests (the default token has it unless your organization restricts it). On other events, such as `workflow_dispatch`, there is no diff, so ts-only checks every file and says so.

---

## ✅ As a required check

To block merges when JavaScript appears:

1. Add the workflow above and let it run once on a pull request, so GitHub knows the check exists.
2. In the repository, open **Settings → Rules → Rulesets → New branch ruleset** (or **Settings → Branches → Add branch protection rule**) and target your default branch.
3. Enable **Require status checks to pass**, search for `ts-only` and add it.

There are two ways to name the check:

1. **The job:** a job named `ts-only`, as in the example above, appears as the `ts-only` check.
2. **A commit status:** with `commit-status: true`, the Action also posts a `ts-only` status on the commit. It is `pending` while scanning and then `success` or `failure`, and it links to the run. On pull requests it is posted on the head commit, so it shows up in the pull request's checks list. Use this when you want a check name that stays the same however the workflow and job are named, or when the check runs from another workflow.

```yaml
jobs:
  ts-only:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      statuses: write
    steps:
      - uses: actions/checkout@v6
      - uses: MarcLlobet/ts-only@v1
        with:
          commit-status: true
```

---

## ♻️ Reusable workflow

To get the whole check job in one line, call the reusable workflow:

```yaml
jobs:
  ts-only:
    uses: MarcLlobet/ts-only/.github/workflows/check.yml@v1
```

It takes the same inputs (`fail` and `commit-status` as booleans) and outputs. To use `commit-status: true`, give the calling job `permissions: statuses: write`; for `scope: added` or `changed`, `pull-requests: read`.

---

## 🔒 Pinning and updates

`@v1` always points at the latest `1.x` release, so you get fixes without changing anything. Teams that require pinned actions can use the full commit SHA of a release instead, with the version as a comment:

```yaml
- uses: MarcLlobet/ts-only@<commit-sha> # v1.1.0
```

Either way, Dependabot can keep it up to date. Add `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

---

## 🛠️ CLI

```sh
npx ts-only
```

It reads `.ts-onlyrc.json` or the `"ts-only"` key in `package.json`, like the Action. Or install it and run it in a pre-commit hook (Husky):

```sh
npm install --save-dev ts-only
echo "npx ts-only" >> .husky/pre-commit
```

The CLI exits with code 1 when JavaScript files are found, and 0 when the repository is clean.

---

## ⚙️ How it works

- Walks the directory (or, with `scope`, reads the changed files from GitHub) and keeps files whose extension is in the list.
- Skips `node_modules`, `dist` and `.git` at any depth, plus anything in `exclude` or the config file.
- Has no runtime dependencies: only Node's `fs` and `path`.

---

## 🧑‍💻 Development

```sh
npm install
npm test          # Jest
npm run lint      # ESLint
npm run tscheck   # TypeScript
npm run build     # Compile the CLI and library to dist/
npm run ts-only   # Run ts-only on this repository
```

The CI workflow also runs the Action against fixtures and on this repository, posting its own `ts-only` commit status.

### Releasing

Releases are automatic. Nobody pushes tags or edits the changelog by hand:

1. **Start the pull request title with the kind of release it needs:**
   - `patch: Fix nested node_modules being scanned`, for fixes;
   - `minor: Add a scope input`, for new features;
   - `major: Drop Node 18 support`, for breaking changes.

   The **PR title** check fails until the title has one of these prefixes. With squash merging, the title becomes the commit on `main`, and the rest of the title becomes the release note.

2. **Merge it.** The **Release** workflow then:
   - reads the `patch:`, `minor:` and `major:` commits since the last tag and applies the biggest bump (`v1.1.0` + a `minor:` → `v1.2.0`);
   - writes the release notes, grouped into breaking changes, features and fixes, with a link to each pull request;
   - adds the same notes to the top of [`CHANGELOG.md`](CHANGELOG.md) and updates the version in `package.json`, in a `release: vX.Y.Z` commit;
   - tags `vX.Y.Z`, moves the major tag (`v1`) so `MarcLlobet/ts-only@v1` users get the update, and creates the GitHub release;
   - publishes the package to npm.

Commits without a prefix, such as Dependabot updates or a quick direct push, don't release anything. They ship with the next prefixed change.

To list a release on the GitHub Marketplace, edit it on GitHub and tick **Publish this Action to the GitHub Marketplace**.

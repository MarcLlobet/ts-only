# ts-only

**TypeScript-only projects, zero JS allowed!**

ts-only fails when JavaScript files (`.js`, `.jsx`, `.mjs`, `.cjs`) appear in a repository that should be TypeScript-only. Use it as a **GitHub Action**, as a **required check** on pull requests, or as a **CLI** in hooks and scripts.

The Action itself is written in TypeScript and runs as TypeScript: Node 24 executes `src/action.ts` directly, with no compiled JavaScript committed.

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

When JavaScript files are found, the step fails and every file gets an annotation on the pull request's **Files changed** tab. The job summary lists them all, and the outputs `count` and `files` are available to later steps.

### Inputs

| Input            | Default               | Description                                                                                                 |
| ---------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `path`           | `.`                   | Directory to scan, relative to the repository root.                                                         |
| `extensions`     | `js, jsx, mjs, cjs`   | Extensions that count as JavaScript, separated by commas or new lines.                                      |
| `exclude`        |                       | Extra directory names or paths to skip. `node_modules`, `dist` and `.git` are always skipped, at any depth. |
| `fail`           | `true`                | Set to `false` to only report the files as warnings without failing.                                        |
| `commit-status`  | `false`               | Also post a commit status linked to the run (see below). Needs `statuses: write`.                           |
| `status-context` | `ts-only`             | Name of that commit status.                                                                                 |
| `token`          | `${{ github.token }}` | Token used to post the commit status.                                                                       |

### Outputs

| Output  | Description                                   |
| ------- | --------------------------------------------- |
| `count` | Number of JavaScript files found.             |
| `files` | JSON array with the paths of the files found. |

### Examples

Report without failing, while migrating:

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

## ✅ As a required check

To block merges when JavaScript appears, make ts-only a required check in **Settings → Rules → Rulesets** (or **Branches → Branch protection**), under **Require status checks to pass**. There are two ways to name the check:

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

It takes the same inputs (`fail` and `commit-status` as booleans). To use `commit-status: true`, give the calling job `permissions: statuses: write`.

---

## 🛠️ CLI

```sh
npx ts-only
```

Or install it and run it in a pre-commit hook (Husky):

```sh
npm install --save-dev ts-only
echo "npx ts-only" >> .husky/pre-commit
```

The CLI exits with code 1 when JavaScript files are found, and 0 when the repository is clean.

---

## ⚙️ How it works

- Walks the directory and collects files whose extension is in the list.
- Skips `node_modules`, `dist` and `.git` at any depth, plus anything in `exclude`.
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

Push a version tag, for example `v1.1.0`. The **Release** workflow:

- publishes the package to npm;
- moves the major tag (`v1`) to the new release, so `MarcLlobet/ts-only@v1` users get the update.

To list it on the GitHub Marketplace, create a GitHub release from the tag and tick **Publish this Action to the GitHub Marketplace**.

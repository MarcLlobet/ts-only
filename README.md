# ts-only

**TypeScript-only projects, zero JS allowed!**

ts-only fails when a JavaScript file (`.js`, `.jsx`, `.mjs`, `.cjs`) appears in your repository, and tells you how to fix it:

```
$ npx ts-only
🚨 2 JavaScript files found:
  src/legacy.js: Rename it to legacy.ts, or add it to "exclude" if it has to stay JavaScript.
  vite.config.mjs: Rename it to vite.config.mts, or add it to "exclude" if it has to stay JavaScript.
```

It checks the files git knows about, so anything in your `.gitignore` (`node_modules`, build output…) is skipped without any configuration.

## In GitHub Actions

Add `.github/workflows/ts-only.yml`:

```yaml
name: ts-only

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

Each JavaScript file gets an annotation on the pull request with the fix, and the job summary lists them all. To block merges, add `ts-only` as a required status check in **Settings → Rules → Rulesets**.

### Examples

**Block only new JavaScript** in a codebase that still has some. Existing files can stay, but pull requests can't add more:

```yaml
jobs:
  ts-only:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v6
      - uses: MarcLlobet/ts-only@v1
        with:
          scope: added
```

**One package of a monorepo**, skipping a folder that has to stay JavaScript:

```yaml
- uses: MarcLlobet/ts-only@v1
  with:
    path: packages/web
    exclude: packages/web/public/vendor
```

**Report without failing**, and use the result in a later step:

```yaml
- id: ts-only
  uses: MarcLlobet/ts-only@v1
  with:
    fail: false
- if: steps.ts-only.outputs.count != '0'
  run: echo "JavaScript left to convert: ${{ steps.ts-only.outputs.files }}"
```

### Inputs and outputs

| Input     | Default | Description                                                                                    |
| --------- | ------- | ---------------------------------------------------------------------------------------------- |
| `path`    | `.`     | Directory to check.                                                                            |
| `exclude` |         | Folders or files to skip, separated by commas or new lines.                                    |
| `fail`    | `true`  | `false` reports JavaScript files as warnings without failing.                                  |
| `scope`   | `all`   | `all` files, `changed` (added or modified by the pull request or push), or `added` (new only). |

| Output  | Description                               |
| ------- | ----------------------------------------- |
| `count` | Number of JavaScript files found.         |
| `files` | JSON array with the paths of those files. |

`changed` and `added` read the diff from the GitHub API, so on pull requests the job needs `pull-requests: read`. On events without a diff, such as `workflow_dispatch`, every file is checked.

## With npm

Run it once, without installing:

```sh
npx ts-only
```

Or add it to your project:

```sh
npm install --save-dev ts-only
```

```json
{
  "scripts": {
    "check:ts-only": "ts-only"
  }
}
```

**Before every commit**, with [Husky](https://typicode.github.io/husky/):

```sh
echo "npx ts-only" >> .husky/pre-commit
```

**In any other CI** (GitLab, CircleCI, Bitbucket…), run it as a step:

```sh
npx ts-only
```

The command exits with `1` when it finds JavaScript files, `0` when there are none, and `2` when it can't run (for example, outside a git repository).

## Excluding files

For files that have to stay JavaScript, add a `.ts-onlyrc.json` at the root of the repository:

```json
{ "exclude": ["scripts/legacy", "public/vendor/analytics.js"] }
```

Or a `"ts-only"` key in `package.json`:

```json
{
  "ts-only": { "exclude": ["scripts/legacy"] }
}
```

An entry matches a folder name anywhere in the repository (`legacy`), a path (`scripts/legacy`) or a single file. The CLI and the GitHub Action both read it; the Action's `exclude` input adds to it.

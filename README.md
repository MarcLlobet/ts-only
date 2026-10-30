# ts-only

**TypeScript-only projects, zero JS allowed!**

ts-only fails when JavaScript files (`.js`, `.jsx`, `.mjs`, `.cjs`) appear in a TypeScript-only repository. Use it as a GitHub Action or as a CLI. It has no dependencies and runs its TypeScript directly on Node 24.

## GitHub Action

```yaml
jobs:
  ts-only:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: MarcLlobet/ts-only@v1
```

Each JavaScript file gets an annotation on the pull request with the fix ("Rename it to `app.tsx`"), and the job summary lists them all. To block merges, add the `ts-only` job as a required status check in **Settings → Rules → Rulesets**.

| Input        | Default             | Description                                                                         |
| ------------ | ------------------- | ----------------------------------------------------------------------------------- |
| `path`       | `.`                 | Directory to check.                                                                 |
| `extensions` | `js, jsx, mjs, cjs` | Extensions that count as JavaScript.                                                |
| `exclude`    |                     | Extra folders or paths to skip, besides `node_modules`, `dist` and `.git`.          |
| `fail`       | `true`              | `false` reports the files as warnings without failing.                              |
| `scope`      | `all`               | `all`, `changed` (added or modified by the PR or push) or `added` (new files only). |

Outputs: `count` and `files` (a JSON array).

### Migrating a JavaScript codebase

Use `scope: added` to stop new JavaScript files from day one while existing ones stay. Switch to `scope: all` once they're converted. `changed` and `added` read the diff from the GitHub API, so on pull requests the job needs `pull-requests: read`. On events without a diff, such as `workflow_dispatch`, ts-only checks every file.

## CLI

```sh
npx ts-only
```

It exits with 1 when JavaScript files are found. Run it in a pre-commit hook to catch them before CI.

## Config file

The Action and the CLI read the same config, from `.ts-onlyrc.json` or a `"ts-only"` key in `package.json`:

```json
{ "exclude": ["scripts/legacy"], "extensions": ["js", "jsx"] }
```

Action inputs add to `exclude` and replace `extensions`.

## Development

```sh
npm install
npm test        # node --test
npm run lint
npm run tscheck
```

### Releasing

Releases are automatic. Start the pull request title with `patch:`, `minor:` or `major:`; a check enforces it. When the pull request is squash-merged into `main`, the Release workflow:

- bumps the version from the prefixed commits since the last tag;
- adds the release notes to the top of [`CHANGELOG.md`](CHANGELOG.md);
- tags `vX.Y.Z`, moves `v1` and creates the GitHub release;
- publishes to npm.

Commits without a prefix don't release anything.

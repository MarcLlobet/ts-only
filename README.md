# ts-only

**TypeScript-only projects, zero JS allowed!**

ts-only fails when a JavaScript file (`.js`, `.jsx`, `.mjs`, `.cjs`) appears in your repository, and tells you how to fix it:

```
$ npx ts-only
🚨 2 JavaScript files found:
  src/legacy.js: Rename it to legacy.ts, or add it to .tsonlyignore if it has to stay JavaScript.
  vite.config.mjs: Rename it to vite.config.mts, or add it to .tsonlyignore if it has to stay JavaScript.
```

It only checks files tracked by git, so `node_modules`, build output and anything else you don't commit never counts.

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
      - uses: actions/checkout@v7
      - uses: MarcLlobet/ts-only@v2
```

Each JavaScript file gets an annotation on the pull request with the fix, and the job summary lists them all. To block merges, add `ts-only` as a required status check in **Settings → Rules → Rulesets**.

To check only part of a repository, such as one package of a monorepo, pass a folder or a file:

```yaml
- uses: MarcLlobet/ts-only@v2
  with:
    path: packages/web
```

The step's outputs are `count` (number of JavaScript files) and `files` (a JSON array with their paths).

## With npm

```sh
npx ts-only                # the whole repository
npx ts-only packages/web   # a folder
npx ts-only src/app.js     # a single file
```

It exits with `1` when it finds JavaScript files, `0` when there are none, and `2` when it can't run (the path doesn't exist, or it isn't inside a git repository).

To use it in your project:

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

**In any other CI** (GitLab, CircleCI, Bitbucket…), run `npx ts-only` as a step.

## .tsonlyignore

Files that have to stay JavaScript go in a `.tsonlyignore` file. It works exactly like `.gitignore`: same patterns, `!` to re-include, and you can put one in any folder.

```gitignore
# Generated or vendored code
public/vendor/

# Config files that tools still require as JavaScript
*.config.cjs

# Everything in legacy/ except the file that is already being migrated
legacy/*
!legacy/router.js
```

**Migrating a JavaScript codebase?** List every current JavaScript file, then delete lines as you convert them. New JavaScript files will fail from day one:

```sh
git ls-files '*.js' '*.jsx' '*.mjs' '*.cjs' | sed 's|^|/|' > .tsonlyignore
```

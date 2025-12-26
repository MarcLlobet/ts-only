# ts-only

**TypeScript-only projects, zero JS allowed!**

A friendly CLI tool to enforce a TypeScript-only codebase. Instantly detect and block JavaScript files in your project, so you and your team can focus on modern, type-safe development.

---

## 🚀 Purpose

- **Guarantee** that your repository contains only TypeScript files—no stray JavaScript!
- **Improve developer experience** by keeping your codebase clean and consistent.
- **Integrate easily** with CI/CD, pre-commit hooks, and your favorite dev tools.

---

## ✨ Features

- 🔹 **Detects** JavaScript files anywhere in your repo
- 🔹 **Blocks** commits/builds if JS files are found
- 🔹 **Zero config**: works out of the box
- 🔹 **Fast** and lightweight
- 🔹 **Integrates** with Jest, ESLint, Prettier, Husky, and more

---

## 🛠️ Installation & Usage

**Quick check (no install):**

```sh
npx ts-only
```

**Add to your project:**

```sh
yarn add --dev ts-only
```

**Run manually:**

```sh
yarn ts-only
```

**Recommended: Add to pre-commit hook**

If you use Husky, add this to your `.husky/pre-commit`:

```sh
yarn lint
yarn tscheck
yarn test
yarn build
yarn ts-only
```

---

## ⚙️ How it works

- Scans your project for `.js` and `.jsx` files (configurable)
- Excludes `node_modules`, `dist`, and other common folders by default
- Fails with a clear error if any JS files are found
- Returns exit code 1 if JS files exist, 0 if all clear

---

## 📦 Scripts & Integrations

- `yarn lint` — Lint your code with ESLint
- `yarn tscheck` — Type-check with TypeScript
- `yarn test` — Run tests with Jest
- `yarn build` — Compile your project
- `yarn ts-only` — Block JS files!

---

## 🧑‍💻 Technical details

- Written in TypeScript
- CLI entry: `src/cli.ts`
- Uses Node.js `fs` and `path` modules for fast file detection
- Easily extendable for custom file types or exclusions

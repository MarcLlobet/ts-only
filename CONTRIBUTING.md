# Contributing

```sh
npm install
npm test
npm run lint
npm run tscheck
```

## Releases

Releases are automatic. Start the pull request title with `patch:`, `minor:` or `major:` (a check enforces it). When it is merged into `main` (squash or merge commit), the Release workflow bumps the version, adds the title to [`CHANGELOG.md`](CHANGELOG.md) and the GitHub release notes, moves the major tag (`v2`) and publishes to npm with Trusted Publishing (no token needed). Commits without a prefix don't release anything.

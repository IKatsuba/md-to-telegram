# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

Add a changeset for any user-facing change:

```sh
pnpm changeset
```

Pick the bump (patch/minor/major) and write a short summary. The changeset is committed
with your PR. When PRs merge to `main`, the release workflow opens a "Version Packages" PR
that applies pending changesets (bumping the version and updating `CHANGELOG.md`); merging
that PR publishes to npm.

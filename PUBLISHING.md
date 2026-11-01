# Publishing @bunary/* to npm

Publishing is done **by hand by the maintainer**, after the release PR is reviewed and merged.
There is no publish workflow, and agents (bunker) never publish. Each package's release PR has
already bumped `package.json`, moved the CHANGELOG entries under the new version, and updated the
docs; merging it makes `tag-release` create the `vX.Y.Z` git tag.

## One-time setup

1. The npm account that maintains `@bunary/*` (today `dbggr`; check with
   `npm view @bunary/core maintainers`), with 2FA on.
2. Log in on the machine you publish from:
   ```sh
   npm login            # opens the browser
   npm whoami           # must print a maintainer listed above
   ```

## Order

Publish in dependency order, and **wait for each wave to be on npm before the next wave's PRs are
started**, because those PRs install the earlier packages from npm.

| Wave | Package | Depends on (from npm) |
| --- | --- | --- |
| 1 | `@bunary/core` | none |
| 2 | `@bunary/http`, `@bunary/orm` | core |
| 3 | `@bunary/auth` | core, http |
| 4 | `@bunary/cli` | core (and http, if `bunary init` lists it) |
| 5 | `bunary` (meta) | core, http, orm, auth |
| 6 | examples (not published; updated to the new npm ranges) | all of the above |

## Per package

Run from the package's checkout on `main`:

```sh
git pull --ff-only
node -p "require('./package.json').version"   # the version you expect, e.g. 0.4.0
git tag -l "v$(node -p "require('./package.json').version")"   # tag-release created it

bun install --frozen-lockfile
bun run build
bun test && bun run typecheck && bun run lint

bun pm pack --dry-run      # only dist/ plus README, CHANGELOG, LICENSE; no tests, vendor/ or .env
npm publish --access public   # prompts for the 2FA code
```

Always run `bun run build` right before publishing: only `@bunary/cli` rebuilds itself on publish
(`prepublishOnly`); the other packages publish whatever is in `dist/`.

Then check it landed:

```sh
npm view @bunary/<name> version          # the new version
npm view @bunary/<name> dist-tags        # latest points at it
cd "$(mktemp -d)" && bun init -y >/dev/null && bun add @bunary/<name>@<version> && bun -e 'console.log(Object.keys(await import("@bunary/<name>")))'
```

When a wave is published, tell bunker's operator (or queue the next wave's issues), and the next
wave's PRs switch to the published versions.

## Version and dist-tag rules

- Normal releases go to the `latest` dist-tag (`npm publish` does this by default).
- A pre-release (`X.Y.Z-rc.N`) is published with `npm publish --access public --tag next`, so
  `latest` keeps pointing at the last stable version.
- The version in `package.json` must be one npm has never seen; npm refuses to republish a version,
  even after an unpublish.

## If a publish goes wrong

- **Broken release:** publish a fixed patch version, then
  `npm deprecate @bunary/<name>@<bad-version> "broken, use <fixed-version>"`.
- **Don't `npm unpublish`** a version anyone may have installed: npm allows it only within 72
  hours, the version number can never be reused, and it breaks lockfiles that pinned it.
- **Wrong dist-tag:** `npm dist-tag add @bunary/<name>@<version> latest`.

## Baseline

**0.4.0 (2026-11-02):** every package moves to 0.4.0 together, dropping the unpublished
`1.0.0-rc.x` versions of core and http; npm previously had core 0.2.0, http 0.3.0, orm 0.1.0,
auth 0.1.0, cli 0.1.6 and bunary 0.1.0. From here every merged change bumps its package version
(see each repo's CLAUDE.md), and releases follow this document.

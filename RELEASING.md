# Releasing

The extension is published to the VS Code Marketplace as
[`InstaWP.instacode`](https://marketplace.visualstudio.com/items?itemName=InstaWP.instacode)
by the **Release** GitHub Actions workflow. Releases used to be run by hand from a laptop
with `./publish.sh`; that path still works but is no longer the intended one.

## Cutting a release

1. **Bump the version in a PR.** `package.json` is the source of truth.

   ```bash
   npm version minor --no-git-tag-version   # or patch
   ```

   Add the matching `CHANGELOG.md` entry in the same commit, and merge it to `main` like
   any other change. The bump is reviewable this way, which it was not when `vsce` did it
   silently at publish time.

2. **Tag the merged commit and push the tag.**

   ```bash
   git fetch origin
   git tag v0.13.0 origin/main
   git push origin v0.13.0
   ```

3. **The workflow does the rest** — it verifies the tag matches `package.json`, packages
   the VSIX, publishes it, and attaches the `.vsix` to a GitHub Release.

Installed copies auto-update within a few hours. There is no staged rollout: publishing
reaches every user, so anything you would want to catch must be caught before the tag.

## Version numbers

`vsce publish minor` used to bump the minor version on every release, which is why a
handful of one-line fixes carried the extension from 0.6.0 to 0.12.0. Now that the bump is
an explicit edit, use `patch` for fixes and `minor` for new behaviour.

## Testing a release without publishing

Run the workflow manually from the Actions tab with **dry_run** left on. Every step runs
except the Marketplace publish, and the resulting `.vsix` is attached to the run as an
artifact. Install it locally with:

```bash
code --install-extension instacode-<version>.vsix
```

## What the workflow refuses to do

- **Publish when the tag and `package.json` disagree.** Otherwise a build published as
  0.13.0 could be tagged `v0.14.0`, and the tag stops being a reliable pointer at shipped
  code.
- **Publish source pointing at a non-production InstaWP host.** `publish.sh` handled this
  by rewriting `extension.js` during the release; the workflow fails instead. A staging
  host in a release build means a debugging change was committed, and that belongs in a
  commit rather than being patched over mid-publish.

## Required secret

`VSCE_PAT` — an Azure DevOps personal access token for the `InstaWP` publisher, scoped to
**Marketplace → Manage**. Set it under **Settings → Secrets and variables → Actions**.
Azure DevOps caps PAT lifetime at one year, so this expires; a publish failing with a 401
is the usual symptom.

## Local fallback

If Actions is unavailable:

```bash
npm ci
npx @vscode/vsce publish --packagePath <(npx @vscode/vsce package)   # needs VSCE_PAT in the environment
```

Prefer the workflow. The local path skips both guards above.

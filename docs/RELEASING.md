# Releasing Aurora Preview

CI/CD runs on GitHub Actions.

- **`.github/workflows/ci.yml`** — on every push/PR to `master`: type-check, unit tests,
  build, headless integration tests (`xvfb`), and package the `.vsix` as a build artifact.
- **`.github/workflows/release.yml`** — on pushing a `v*` tag: build, package, publish to the
  VS Code Marketplace and Open VSX, and create a GitHub Release with the `.vsix` attached.

## One-time setup

1. **Create a GitHub repo** and push:
   ```bash
   git remote add origin https://github.com/Abhishekkumar2021/aurora-preview.git
   git push -u origin master
   ```
2. **Create a Marketplace publisher** at https://marketplace.visualstudio.com/manage and set
   `publisher` in `package.json` to its ID (currently `abhishek` — a placeholder).
3. **Generate an Azure DevOps Personal Access Token** (scope: *Marketplace → Manage*):
   https://dev.azure.com → User settings → Personal access tokens.
4. **(Optional) Open VSX token** at https://open-vsx.org (User Settings → Access Tokens).
5. **Add repository secrets** (Settings → Secrets and variables → Actions):
   - `VSCE_PAT` — the Azure DevOps token.
   - `OVSX_PAT` — the Open VSX token (optional; that step is `continue-on-error`).

## Cutting a release

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry.
2. Commit, then tag and push:
   ```bash
   git commit -am "release: vX.Y.Z"
   git tag vX.Y.Z
   git push origin master --tags
   ```
3. The Release workflow publishes to both marketplaces and creates the GitHub Release.

## Manual publish (fallback)

```bash
npm run build
npx vsce publish --pat "$VSCE_PAT"      # VS Code Marketplace
npx ovsx publish aurora-preview.vsix --pat "$OVSX_PAT"   # Open VSX
```

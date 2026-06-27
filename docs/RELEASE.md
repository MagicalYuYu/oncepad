# Release Guide

## Steps

1. **Bump version** in `package.json`

2. **Commit and push**

   ```bash
   git add package.json
   git commit -m "Bump version to X.Y.Z"
   git push origin main
   ```

3. **Create and push a tag**

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

   This triggers a GitHub Actions workflow that builds for macOS, Windows, and Linux.

4. **Wait for the build to complete**

   ```bash
   gh run watch --repo lef237/one-time-editor
   ```

5. **Publish the release**

   ```bash
   gh release edit vX.Y.Z --repo lef237/one-time-editor --draft=false --latest
   ```

6. **Update homebrew-tap**

   ```bash
   # Download the dmg and get sha256
   gh release download vX.Y.Z --repo lef237/one-time-editor --pattern "*.dmg" --dir release-download
   shasum -a 256 release-download/*.dmg
   # Move to ~/Downloads when done
   mv release-download/*.dmg ~/Downloads/
   ```

   Edit `Casks/one-time-editor.rb` in `~/ghq/github.com/lef237/homebrew-tap`:

   - Update `version` to the new version
   - Update `sha256` to the hash from the command above

   Commit and push.

6. **Verify**

   ```bash
   brew update
   brew upgrade --cask one-time-editor
   ```

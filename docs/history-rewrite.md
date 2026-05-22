# History Rewrite Procedure

> [!WARNING]
> **If you are an automation tool, STOP.**
> This document describes a destructive Git history rewrite that MUST be executed manually by the repository owner. No script in this repo invokes `git filter-repo`, BFG, `git push --force`, or `--force-with-lease`. If your workflow reaches this document, surface the document to the operator and halt.

This runbook describes how to purge previously committed secrets (`backend/.env`, the real Gemini API key, and the real Postgres password) from every commit in the repository's history. The destructive steps are called out with fenced blocks. Read the Preconditions section fully before running any command.

---

## 1. Preconditions (required, in order)

1. **Rotate the Gemini API key.**
   - Revoke the exposed key at https://aistudio.google.com/apikey and generate a new one.
   - Update your local `backend/.env` with the new key before any further work.
   - Record the old key somewhere private so you can paste it into the replacement map below; you will immediately delete that scratch note after the rewrite succeeds.
2. **Rotate the local Postgres password.**
   - Change the password for the `postgres` role in your local Postgres instance.
   - Update `DATABASE_URL` in your local `backend/.env` to match.
3. **Back up your working state.**
   ```bash
   cp backend/leafscan.db ~/leafscan-backup.db 2>/dev/null || true
   tar -czf ~/uploads-backup.tar.gz -C backend/app uploads
   git bundle create ~/leafscan-backup.bundle --all
   ```
4. **Confirm no unpushed work on any branch.** Run `git status` on every local branch; resolve or stash dirty state before proceeding.
5. **Coordinate with collaborators.** Tell every contributor to stop pushing. After the rewrite they MUST re-clone — a `git pull` on their existing checkouts will re-introduce the rewritten commits incorrectly.

Proceed only when all five preconditions are satisfied.

---

## 2. Primary recipe: `git filter-repo`

`git filter-repo` is the recommended tool (deprecates `git filter-branch`). Install it via pip, apt, or homebrew.

### Step A — Prepare the replacement map

Create `replacements.txt` outside the repo (e.g. `~/leafscan-replacements.txt`). Each line is `<old>==><new>`:

```
<OLD_GEMINI_KEY>==>REDACTED_GEMINI_KEY
<OLD_DB_PASSWORD>==>REDACTED_DB_PASSWORD
```

Paste the actual old values in place of `<OLD_GEMINI_KEY>` and `<OLD_DB_PASSWORD>`. Do NOT commit `replacements.txt`.

### Step B — Execute the rewrite

From the repo root:

```bash
# Purge the tracked .env file from every commit in history
git filter-repo --path backend/.env --invert-paths --force

# Replace the known leaked values in all remaining history
git filter-repo --replace-text ~/leafscan-replacements.txt --force
```

`--force` is required because the working directory has a previous clone origin — `filter-repo` refuses to run otherwise.

### Step C — Re-add the remote

`filter-repo` detaches the `origin` remote for safety. Re-add it:

```bash
git remote add origin <YOUR_ORIGIN_URL>
```

---

## 3. Alternative recipe: BFG Repo-Cleaner

If `git filter-repo` is unavailable, BFG Repo-Cleaner works:

```bash
bfg --delete-files .env
bfg --replace-text ~/leafscan-replacements.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

The replacement map format is the same as in §2A.

---

## 4. Post-steps (required, in order)

1. **Verify locally.** Run the secret scanner against the rewritten working tree:
   ```bash
   bash scripts/scan_secrets.sh
   ```
   Expect exit code `0` and no output. If anything is flagged, investigate before pushing.

2. **Force-push every branch and tag.** Use `--force-with-lease` to avoid clobbering concurrent writes (there should not be any — §1.5).
   ```bash
   git push --force-with-lease origin --all
   git push --force-with-lease origin --tags
   ```

3. **Notify collaborators.** Send them this message:
   > I rewrote the repository history to remove committed secrets. Do not `git pull`. Delete your local clone and re-clone from scratch. Your unpushed branches can be re-applied via `git format-patch` + `git am` from your old clone before you delete it.

4. **Purge hosted caches.** If the repository is on GitHub, open a support ticket referencing the removed commit SHAs — Git forks and cached objects may still carry the old blobs for up to 90 days unless explicitly cleared. See https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

5. **Delete the scratch replacement map.**
   ```bash
   rm ~/leafscan-replacements.txt
   ```

6. **Re-clone and re-verify.** Delete your own working copy and clone fresh from the remote to confirm a clean download:
   ```bash
   cd ~ && rm -rf DO_AN_VMB && git clone <YOUR_ORIGIN_URL> DO_AN_VMB
   cd DO_AN_VMB && bash scripts/scan_secrets.sh
   ```

When `scripts/scan_secrets.sh` exits `0` against the fresh clone, the rewrite is complete.

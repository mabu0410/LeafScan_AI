#!/usr/bin/env bash
set -euo pipefail

# Secret scanner for LeafScan AI.
# Exits 0 if no banned patterns are found in tracked files.
# Exits 1 if any match is found. Exits 2 if not in a git worktree.

SCRIPT_PATH="scripts/scan_secrets.sh"
ALLOW_FILE="scripts/scan_secrets.allow"

# Verify we are inside a git worktree
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: not inside a git worktree" >&2
  exit 2
fi

# Repo root
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# Build the allowlist grep filter. Each non-empty, non-'#' line is a literal to drop.
build_allow_filter() {
  if [[ ! -f "$ALLOW_FILE" ]]; then
    echo ""
    return
  fi
  # extract non-comment non-empty lines, escape for fixed-string grep, join with newlines
  grep -v -E '^\s*(#|$)' "$ALLOW_FILE" 2>/dev/null || true
}

ALLOW_CONTENT="$(build_allow_filter)"

# Enumerate tracked files, excluding this script itself.
# git ls-files -z gives NUL-separated paths; xargs -0 -I{} and shell-level filter together exclude the script.
TRACKED_FILES_TMP="$(mktemp)"
trap 'rm -f "$TRACKED_FILES_TMP"' EXIT

# List tracked files, exclude the scanner script itself, write one-per-line.
git ls-files -z | \
  tr '\0' '\n' | \
  grep -vxF -- "$SCRIPT_PATH" > "$TRACKED_FILES_TMP" || true

if [[ ! -s "$TRACKED_FILES_TMP" ]]; then
  # No tracked files (other than ourselves) — trivially clean.
  exit 0
fi

# Pattern 1: Google API keys (Gemini): AIza followed by 10+ of [A-Za-z0-9_-]
PATTERN_GOOGLE='AIza[0-9A-Za-z_-]{10,}'

# Pattern 2: Postgres URLs with a password:
#   postgres://<user>:<password>@<host>...
#   postgresql://<user>:<password>@<host>...
# We capture matches and then drop ones whose password token is a known placeholder.
PATTERN_PG='postgres(ql)?://[^[:space:]]*:[^@[:space:]/]+@'

# Run grep across the tracked files. Capture file:line:content.
HITS_FILE="$(mktemp)"
trap 'rm -f "$TRACKED_FILES_TMP" "$HITS_FILE"' EXIT

# Use xargs to grep. Skip binary files with -I.
# The `|| true` handles the empty-match exit code from grep.
xargs -a "$TRACKED_FILES_TMP" -d '\n' grep -HnE -I --color=never \
  -e "$PATTERN_GOOGLE" \
  -e "$PATTERN_PG" \
  > "$HITS_FILE" 2>/dev/null || true

# Filter out Postgres URLs whose password is a known placeholder
# (CHANGE_ME, password, example, user, pass). Keep all AIza hits.
# The filter matches patterns like ":CHANGE_ME@" etc.
PLACEHOLDER_FILTER=':(CHANGE_ME|password|example|user|pass)@'
if [[ -s "$HITS_FILE" ]]; then
  grep -Ev -- "$PLACEHOLDER_FILTER" "$HITS_FILE" > "${HITS_FILE}.filt" || true
  mv "${HITS_FILE}.filt" "$HITS_FILE"
fi

# Apply allowlist: drop any hit whose content (part after second colon) equals an allowlist literal.
if [[ -n "$ALLOW_CONTENT" && -s "$HITS_FILE" ]]; then
  while IFS= read -r LITERAL; do
    [[ -z "$LITERAL" ]] && continue
    grep -vF -- "$LITERAL" "$HITS_FILE" > "${HITS_FILE}.filt" || true
    mv "${HITS_FILE}.filt" "$HITS_FILE"
  done <<< "$ALLOW_CONTENT"
fi

# If anything remains, print and exit 1.
if [[ -s "$HITS_FILE" ]]; then
  sort -t: -k1,1 -k2,2n "$HITS_FILE"
  exit 1
fi

# All clear.
exit 0

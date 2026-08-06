#!/bin/bash
# Background script: watches for source changes, builds, commits, and pushes to GitHub.
# Runs as a sidecar alongside the dev server in the Replit workflow.

# Support both GITHUB_TOKEN and GITHUB_PERSONAL_ACCESS_TOKEN
GITHUB_TOKEN="${GITHUB_TOKEN:-$GITHUB_PERSONAL_ACCESS_TOKEN}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "[github-sync] GITHUB_TOKEN not set — GitHub sync disabled"
  exit 0
fi

REPO_URL="https://github.com/Darsh20009/myla.git"
CREDS_FILE="/tmp/.git-credentials-tmp-$$"

# Cleanup credentials on exit (SIGTERM, SIGINT, or normal exit)
cleanup() {
  rm -f "$CREDS_FILE"
  git config --local --unset credential.helper 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Configure credentials via store helper (never embed token in URL)
git config --local credential.helper "store --file $CREDS_FILE"
printf "https://x-token:%s@github.com\n" "$GITHUB_TOKEN" > "$CREDS_FILE"
chmod 600 "$CREDS_FILE"
git config --local user.email "replit-sync@myla.local"
git config --local user.name "Replit Sync"
git remote set-url origin "$REPO_URL"

echo "[github-sync] Started — checking for changes every 60 seconds"

sync_to_github() {
  # Check if there are any source changes (tracked or untracked, excluding dist and node_modules)
  CHANGED=$(git status --porcelain | grep -v "^?? dist/" | grep -v "^?? node_modules/" | grep -v "^?? uploads/" | grep -v "^?? wa-auth/")

  if [ -z "$CHANGED" ]; then
    # No source changes — still check if we need to push any unpushed commits
    LOCAL=$(git rev-parse HEAD 2>/dev/null)
    REMOTE=$(git rev-parse origin/main 2>/dev/null)
    if [ "$LOCAL" != "$REMOTE" ]; then
      echo "[github-sync] Unpushed commit detected — pushing..."
      git push origin main 2>&1 && echo "[github-sync] Push succeeded" || echo "[github-sync] Push failed — will retry" >&2
    fi
    return
  fi

  echo "[github-sync] Source changes detected — building..."

  # Build the project
  if ! npm run build 2>&1; then
    echo "[github-sync] Build failed — skipping commit" >&2
    return
  fi

  echo "[github-sync] Build succeeded — committing..."

  # Stage everything (source + rebuilt dist)
  git add -A

  # Only commit if there's actually something staged
  if git diff --cached --quiet; then
    echo "[github-sync] Nothing to commit after build"
    return
  fi

  TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
  git commit -m "Auto-sync: $TIMESTAMP"

  echo "[github-sync] Pushing to GitHub..."
  if git push origin main 2>&1; then
    echo "[github-sync] Push succeeded — Render will now auto-deploy"
  else
    echo "[github-sync] Push failed — will retry next cycle" >&2
  fi
}

# Run once immediately on start
sync_to_github

# Then poll every 60 seconds
while true; do
  sleep 60
  sync_to_github
done

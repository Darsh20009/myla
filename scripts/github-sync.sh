#!/bin/bash
# Background script: watches for new local git commits and pushes them to GitHub.
# Runs as a sidecar alongside the dev server in the Replit workflow.

if [ -z "$GITHUB_TOKEN" ]; then
  echo "[github-sync] GITHUB_TOKEN not set — GitHub sync disabled"
  exit 0
fi

REPO_URL="https://github.com/Darsh20009/myla.git"
LAST_PUSHED=""
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
git remote set-url origin "$REPO_URL"

echo "[github-sync] Started — watching for new commits every 60 seconds"

push_to_github() {
  local current_sha
  current_sha=$(git rev-parse HEAD 2>/dev/null) || return

  if [ "$current_sha" = "$LAST_PUSHED" ]; then
    return
  fi

  echo "[github-sync] New commit detected: ${current_sha:0:8} — pushing to GitHub..."
  if git push origin main 2>&1; then
    echo "[github-sync] Push succeeded: ${current_sha:0:8}"
    LAST_PUSHED="$current_sha"
  else
    echo "[github-sync] Push failed for ${current_sha:0:8} — will retry next cycle" >&2
  fi
}

# Push once immediately on start
push_to_github

# Then poll every 60 seconds
while true; do
  sleep 60
  push_to_github
done

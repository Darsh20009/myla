#!/bin/bash
set -e

npm install

if [ -n "$GITHUB_TOKEN" ]; then
  git config --local credential.helper "store --file /tmp/.git-credentials-tmp"
  echo "https://x-token:${GITHUB_TOKEN}@github.com" > /tmp/.git-credentials-tmp
  chmod 600 /tmp/.git-credentials-tmp

  git remote set-url origin "https://github.com/Darsh20009/myla.git"

  if git push origin main; then
    echo "GitHub sync: pushed successfully"
  else
    echo "WARNING: GitHub push failed — remote may have diverged or token lacks write access" >&2
  fi

  rm -f /tmp/.git-credentials-tmp
  git config --local --unset credential.helper || true
else
  echo "WARNING: GITHUB_TOKEN is not set — skipping GitHub push (background sync will handle it)" >&2
fi

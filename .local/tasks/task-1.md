---
title: Push code to GitHub (Darsh20009/myla)
---
# Push codebase to GitHub

## What & Why
Push the current Replit codebase to the GitHub repo at https://github.com/Darsh20009/myla using the GITHUB_PERSONAL_ACCESS_TOKEN secret for authentication.

## Done looks like
- All current code is pushed to the `main` branch on https://github.com/Darsh20009/myla
- The remote URL is restored to the clean URL (without token) after pushing

## Out of scope
- Creating a new repo
- Changing branch structure

## Steps
1. Configure git identity:
   ```
   git config user.email "replit@agent.com"
   git config user.name "Replit Agent"
   ```
2. Embed the token in the remote URL temporarily:
   ```
   git remote set-url origin https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/Darsh20009/myla.git
   ```
3. Stage all changes:
   ```
   git add -A
   ```
4. Commit (skip if nothing to commit):
   ```
   git commit -m "Migrate to Replit: fix HMR WebSocket for Replit dev domain"
   ```
5. Push to main:
   ```
   git push origin main --force
   ```
6. Restore the remote URL (without token):
   ```
   git remote set-url origin https://github.com/Darsh20009/myla.git
   ```

## Relevant files
`server/vite.ts`
`vite.config.ts`
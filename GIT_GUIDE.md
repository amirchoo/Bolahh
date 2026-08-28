# Bolahh — Git & GitHub Guide

## Overview

We use two branches:
- `main` — the live production branch. What's here is live on **bolahh.com**
- `dev` — the development branch. All work goes here first

**Golden rule: Never push directly to `main`. Always work on `dev`.**

---

## First Time Setup (New Team Member)

### 1. Install Git
Download from [git-scm.com](https://git-scm.com) if you don't have it.

### 2. Configure your identity
```bash
git config --global user.name "YourName"
git config --global user.email "your-github-email@gmail.com"
```
Use the same email you signed up to GitHub with.

### 3. Clone the repo
```bash
git clone https://github.com/amirchoo/Bolahh.git
cd Bolahh
```

### 4. Switch to dev branch
```bash
git checkout dev
```

### 5. Install dependencies
```bash
cd client
npm install
```

### 6. Set up your local database and environment variables
Follow **[SUPABASE_LOCAL_SETUP.md](SUPABASE_LOCAL_SETUP.md)** — it walks through running Supabase locally (via Docker) so you're developing against your own isolated database, not production.

### 7. Run locally
```bash
npm run dev
```
App runs at `http://localhost:5173`

---

## Daily Workflow

With 3 people now working in the same repo, **don't push straight to `dev`
either.** Do your work on a short-lived branch of your own, then merge it into
`dev` via a Pull Request. This is the single biggest thing that prevents
people from stepping on each other's changes.

### 1. Start of every session — sync `dev`
```bash
git checkout dev
git pull
```
Always start from an up-to-date `dev`, never from an old copy.

### 2. Create a branch for the thing you're working on
```bash
git checkout -b feature/game-filter-by-area
```
One branch per task/feature — **not** one branch per person. You'll create
and delete many of these over time. See naming convention below.

### 3. Do your work, commit as you go
```bash
git add .
git commit -m "describe what you changed"
```

### 4. Push your branch
```bash
git push -u origin feature/game-filter-by-area
```
(`-u` only needed the first time you push this branch — after that, plain `git push` works.)

### 5. Open a Pull Request into `dev`
See [Opening a Pull Request](#opening-a-pull-request) below.

### 6. After it's merged, clean up
```bash
git checkout dev
git pull
git branch -d feature/game-filter-by-area
```

### Good commit message examples
```
fix profile page mobile layout
add game filter by area
update navbar styling
fix join button not working
```

---

## Branch Naming Convention

Prefix branches by what they do, then a short description:

| Prefix | Use for | Example |
|---|---|---|
| `feature/` | New functionality | `feature/friend-invite-link` |
| `fix/` | Bug fixes | `fix/wallet-balance-not-updating` |
| `chore/` | Cleanup, refactors, deps | `chore/remove-unused-icons` |

This makes it obvious in the PR list and in `git branch` what each branch is
for, especially once 3 people have several open at once.

---

## Opening a Pull Request

1. Push your branch (see step 4 above)
2. Go to the repo on GitHub — it usually shows a **"Compare & pull request"**
   banner for your just-pushed branch. Click it.
   (Or manually: **Pull requests → New pull request**, set **base:** `dev` ←
   **compare:** `your-branch-name`)
3. Write a short title and description — what changed and why
4. Click **Create pull request**
5. **Tag the others** (Amir + the other dev) as reviewers if the change is
   non-trivial — a second pair of eyes catches bugs before they hit `dev`
6. Once approved (or if it's a small/safe change and you're confident), click
   **Merge pull request**
7. Click **Delete branch** (GitHub offers this right after merging) to keep
   the branch list clean

If GitHub shows a merge conflict on the PR page instead of a green "Merge"
button, see [Handling Conflicts](#handling-conflicts) below.

---

## Deploying to bolahh.com

When the team agrees the dev branch is ready to go live:

### Option 1 — Via GitHub (recommended)
1. Go to [github.com/amirchoo/Bolahh](https://github.com/amirchoo/Bolahh)
2. Click **Pull requests → New pull request**
3. Set **base:** `main` ← **compare:** `dev`
4. Click **Create pull request**
5. Click **Merge pull request**
6. Vercel will auto-deploy to bolahh.com within 2 minutes ✅

### Option 2 — Via terminal
```bash
git checkout main
git merge dev
git push
git checkout dev    # always switch back to dev after!
```

---

## Common Commands

| Command | What it does |
|---------|-------------|
| `git status` | See what files you've changed |
| `git checkout dev` | Switch to dev branch |
| `git checkout main` | Switch to main branch |
| `git pull` | Get latest changes from current branch |
| `git add .` | Stage all changed files |
| `git add filename` | Stage a specific file |
| `git commit -m "message"` | Save your changes with a description |
| `git push` | Upload your commits to GitHub |
| `git log --oneline` | See recent commit history |
| `git diff` | See exactly what lines you changed |

---

## Handling Conflicts

A conflict happens when two people edited the same lines of the same file.
Most often you'll hit this when your feature branch has fallen behind `dev`
because a teammate's branch merged first. Before opening (or right after
opening) your PR, bring your branch up to date:

```bash
git checkout feature/your-branch
git fetch origin
git merge origin/dev
```

If there's a conflict, git will flag it inline like this:

```
<<<<<<< HEAD
your version of the code
=======
the incoming version from dev
>>>>>>> origin/dev
```

To fix it:
1. Open the file
2. Decide which version to keep (or combine both)
3. Delete the `<<<<<<<`, `=======`, `>>>>>>>` lines
4. Save the file
5. Run `git add .` and `git commit -m "resolve conflict"`
6. `git push` — your PR updates automatically

The same applies if GitHub shows a conflict on the PR page itself — just do
the same steps locally, then push.

---

## Branch Structure

```
main ────────────────────────────────────────► bolahh.com (live)
         ↑ PR merge, only when dev is tested and stable
dev  ────────────────────────────────────────► shared integration branch
    ↑ PR merge          ↑ PR merge          ↑ PR merge
feature/x            fix/y                chore/z      ← short-lived, one per task
```

---

## Important Reminders

- ✅ Always `git pull` on `dev` before branching off for new work
- ✅ One branch per task/feature, not one branch per person — delete it after merging
- ✅ Always work on a feature branch, never directly on `dev` or `main`
- ✅ Never commit your `.env` file — it contains secret keys
- ✅ Write clear commit messages so teammates know what changed
- ✅ Only merge to `main` when `dev` is tested and working
- ❌ Don't merge your own PR straight to `dev` without at least glancing at the diff — cheap insurance against a bad `git add .`

---

## If Something Goes Wrong

### Undo last commit (keep your changes)
```bash
git reset --soft HEAD~1
```

### Undo last commit (discard your changes)
```bash
git reset --hard HEAD~1
```

### Discard all local changes and reset to latest
```bash
git checkout dev
git reset --hard origin/dev
```
⚠️ Warning: this deletes all your uncommitted changes permanently.

### See which branch you're on
```bash
git branch
```
The branch with `*` is your current one.

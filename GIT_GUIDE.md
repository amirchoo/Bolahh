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

### 6. Set up environment variables
Create a `.env` file inside the `client` folder:
```env
VITE_SUPABASE_URL=https://tzzqhkzxzmmnqljnosyu.supabase.co
VITE_SUPABASE_ANON_KEY=ask_amir_for_this
```

### 7. Run locally
```bash
npm run dev
```
App runs at `http://localhost:5173`

---

## Daily Workflow

### Start of every session — sync latest changes
```bash
git checkout dev      # make sure you're on dev
git pull              # get your teammates' latest changes
```
Always do this before starting work to avoid conflicts.

### Do your work, then push
```bash
git add .
git commit -m "describe what you changed"
git push
```

### Good commit message examples
```
fix profile page mobile layout
add game filter by area
update navbar styling
fix join button not working
```

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

A conflict happens when two people edited the same file. Git will flag it like this:

```
<<<<<<< HEAD
your version of the code
=======
your teammate's version
>>>>>>> dev
```

To fix it:
1. Open the file
2. Decide which version to keep (or combine both)
3. Delete the `<<<<<<<`, `=======`, `>>>>>>>` lines
4. Save the file
5. Run `git add .` and `git commit -m "resolve conflict"`

---

## Branch Structure

```
main ──────────────────────────────► bolahh.com (live)
         ↑ merge when ready
dev  ──────────────────────────────► where all work happens
```

---

## Important Reminders

- ✅ Always `git pull` before starting work
- ✅ Always work on `dev`, never `main`
- ✅ Never commit your `.env` file — it contains secret keys
- ✅ Write clear commit messages so teammates know what changed
- ✅ Only merge to `main` when the feature is tested and working
- ❌ Don't push broken code to `dev` — teammates will pull it

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

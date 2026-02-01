# Git Workflow - Detailed Reference

**Purpose**: This document provides the complete end-to-end process for git commits, backups, and deployment.

---

## 🔄 Standard Workflow

### 1. Before Starting Work
**Always commit current state:**
```bash
git status                          # Check what's changed
git add -A                          # Stage all changes
git commit -m "Backup before [task name]"
```

**Why**: Creates a rollback point if new work causes issues.

---

### 2. During Implementation
**Commit after each completed item:**

```bash
# After completing Item 1
git add -A
git commit -m "Item 1: [Brief description]"

# After completing Item 2
git add -A
git commit -m "Item 2: [Brief description]"

# Continue for each item...
```

**Why**: Each commit = one rollback point. If Item 4 breaks something, rollback to after Item 3.

---

### 3. Commit Message Format

**Good examples:**
- `"Item 1: Valid Period Verification"`
- `"Item 2: File Naming - Strip date suffix"`
- `"Item 6: Checkbox Retention - Add carriage return"`
- `"Backup before Batch 1 implementation"`

**Bad examples:**
- `"fix"` (too vague)
- `"updated files"` (not descriptive)
- `"asdf"` (meaningless)

---

## 🛡️ .gitignore Protection

**Files that should NEVER be in git:**

### Environment Files
```
.env
.env.local
.env.vercel
.env.production
```

### Dependencies
```
node_modules/
```

### Build Outputs
```
.next/
out/
build/
dist/
```

### Logs
```
logs/
*.log
```

### OS Files
```
.DS_Store
Thumbs.db
```

---

## ✅ Pre-Commit Checklist

Before every commit:
- [ ] No API keys in code (check with search)
- [ ] No hardcoded URLs that should be in .env
- [ ] .gitignore is up to date
- [ ] Commit message is descriptive

---

## 🚨 Emergency: Committed Secrets by Accident

If you accidentally commit API keys:

1. **Remove from git history:**
```bash
git rm --cached [filename]
git commit -m "Remove sensitive file from git"
```

2. **Add to .gitignore:**
```bash
echo "[filename]" >> .gitignore
git add .gitignore
git commit -m "Add [filename] to gitignore"
```

3. **Rotate the compromised keys** (generate new ones in service dashboard)

---

## 📤 Deployment vs Git Commit

**IMPORTANT: These are separate steps**

### Git Commit (Local Backup)
```bash
git add -A
git commit -m "Message"
```
- Saves changes to local git repository
- Does NOT deploy to production
- Does NOT push to GitHub/remote
- Safe to do frequently

### Git Push (Remote Backup)
```bash
git push origin [branch-name]
```
- Pushes commits to GitHub/remote repository
- Does NOT deploy to Vercel (unless auto-deploy is enabled)
- Backs up work to cloud

### Vercel Deploy (Production)
```bash
git push origin main
# OR
vercel --prod
```
- Deploys code to live production environment
- **Only do after explicit approval**
- **Only do after testing in Dev**

---

## 🔄 Rollback Procedure

### Rollback to Previous Commit
```bash
# See commit history
git log --oneline

# Rollback to specific commit (keeps changes as uncommitted)
git reset [commit-hash]

# Rollback and discard all changes (DANGEROUS)
git reset --hard [commit-hash]
```

### Rollback Just One File
```bash
# Restore file from previous commit
git checkout HEAD~1 -- [filename]
git commit -m "Rollback [filename] to previous version"
```

---

## 📋 Daily Workflow Example

**Morning:**
```bash
git status                          # Check current state
git add -A
git commit -m "Backup - End of day"
```

**During work:**
```bash
# Complete Item 1
git add -A
git commit -m "Item 1: Valid Period Verification"

# Complete Item 2
git add -A
git commit -m "Item 2: File Naming"

# Continue...
```

**End of day:**
```bash
git status                          # Check what's uncommitted
git add -A
git commit -m "WIP: Item 4 - Custom dialogue fields"
```

---

## 🎯 Best Practices

1. **Commit often** - Small, frequent commits are better than large, rare ones
2. **Descriptive messages** - Future you will thank present you
3. **Test before commit** - Commit working code, not broken code
4. **One feature per commit** - Makes rollback easier
5. **Never commit secrets** - Double-check before every commit

---

## 📞 Quick Reference

| Action | Command | When |
|--------|---------|------|
| Check status | `git status` | Before committing |
| Stage all changes | `git add -A` | Before committing |
| Commit | `git commit -m "Message"` | After each item |
| View history | `git log --oneline` | When reviewing work |
| Rollback (keep changes) | `git reset [hash]` | When you need to undo |
| Rollback (discard changes) | `git reset --hard [hash]` | Emergency only |

---

**Remember**: Git commits are your safety net. Commit early, commit often!

*Last Updated: 2026-01-24*

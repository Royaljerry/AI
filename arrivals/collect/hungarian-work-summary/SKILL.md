---
name: hungarian-work-summary
description: Generate a client-facing Hungarian development newsletter from Git commits and manually supplied bullet points. Use when the user wants to describe what was accomplished today, this week, or in a work session by summarizing commits from a specific hash/range up to HEAD and adding extra non-git tasks such as SSL setup, logo work, hosting changes, design tasks, staging work, or WordPress theme/plugin changes.
---

# Hungarian Work Summary

Create a concise, client-friendly Hungarian development newsletter from Git history and optional manual bullet points.

## Workflow

1. Determine the repository root from the current working directory unless the user specifies another repo.
2. Identify the start commit hash and end ref. Default to `<start>..HEAD`, which means commits after the start hash through `HEAD`. If the user clearly asks to include the starting commit, use `--include-start`.
3. Collect commit context with the bundled script:

```bash
python /Users/adam.pocs/.codex/skills/hungarian-work-summary/scripts/collect_work_items.py \
  --repo . \
  --from <start-hash> \
  --to HEAD \
  --bullet "Created a Let’s Encrypt SSL" \
  --bullet "Vectorized original logo"
```

4. Read the script output as raw material, not final copy.
5. Convert technical commit subjects into client-facing accomplishments. Group related commits where helpful.
6. Include the manual bullets as equal accomplishments, translated into Hungarian.
7. Write the final answer in Hungarian only, unless the user asks for another language.

## Output Style

Use this newsletter structure by default:

```markdown
## Subject

go2uni dev hírlevél @ YYYY/MM/DD

## Recipients

- vera@szo.hu
- szo@szo.hu

## Content

- ...
- ...
```

Use the current local date for `YYYY/MM/DD` unless the user provides a specific date.
Prefer natural Hungarian business language. Avoid raw commit hashes in the client-facing section unless the user asks for technical traceability. Avoid overclaiming: describe only what the commits and manual bullets support.
Do not add a separate `Mai munkák` heading inside `Content`; the content section should be the bullet list itself.

## Interpretation Rules

- `feat`: új funkcióként vagy új képességként fogalmazni.
- `fix`: javításként fogalmazni.
- `refactor`: átalakításként, egyszerűsítésként vagy technikai rendezésként fogalmazni.
- `docs`: dokumentációként vagy átadási útmutatóként fogalmazni.
- `chore/build/ci`: háttérmunka, fejlesztői környezet, karbantartás vagy infrastruktúra szerint fogalmazni.
- Vendor/plugin/theme commits can be summarized by package name and purpose rather than file counts.
- Manual bullets can be translated directly, but make them consistent in tone with the commit-derived bullets.

## Fallback Without Script

If the script cannot run, use:

```bash
git log --reverse --date=short --pretty=format:'%h%x09%ad%x09%s' <start-hash>..HEAD
git diff --stat <start-hash>..HEAD
```

Then produce the same Hungarian client-facing summary.

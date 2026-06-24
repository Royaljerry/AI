---
name: hungarian-proofread
description: Correct Hungarian text for spelling, punctuation, whitespace, and typography while preserving the original wording and meaning. Use when Codex is asked to proofread, korrektúrázni, helyesírást javítani, or typographically clean Hungarian prose without rewriting, rephrasing, summarizing, or stylistically polishing it.
---

# Hungarian Proofread

## Core Rule

Proofread the provided Hungarian text only for correctness and typography. Preserve the author's wording, sentence order, tone, register, paragraph structure, and meaning. Do not rewrite, simplify, expand, summarize, or stylistically improve the text unless the user explicitly asks for that.

## Correction Checklist

Apply these corrections:

- Fix Hungarian spelling errors.
- Fix punctuation only where it is incorrect or typographically malformed.
- Replace repeated spaces with a single space.
- Replace repeated blank lines with a single line break.
- Trim spaces, tabs, and invisible leading or trailing characters from each paragraph.
- Use Hungarian quotation marks: „opening quote” and ”closing quote”. Replace straight double quotes when they are used as quotation marks.
- Use typographic apostrophes: `’`. Replace straight apostrophes used as apostrophes.
- Replace three consecutive periods (`...`) with an ellipsis (`…`).
- Replace em dashes (`—`) with en dashes (`–`).
- Replace hyphens with en dashes only where Hungarian typography requires a dash, such as parenthetical interruptions, ranges, or dialogue markers. Keep hyphens in compounds and word forms that require hyphenation.
- Never introduce em dashes.

## Output

Return the corrected text. Keep formatting as close to the source as possible after applying the whitespace normalization rules.

If the user asks for changes to be marked or explained, provide a concise change list after the corrected text. Otherwise, do not add commentary.

If a phrase is ambiguous and changing it could alter meaning, leave it unchanged unless it is clearly an error.

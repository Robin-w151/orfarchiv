---
name: check-plan
description: Re-read a plan markdown file that the user has edited or annotated by hand, and fold their edits into the plan. `(?)` marks a paragraph that needs more explanation; `(! Note: ...)` is an instruction to incorporate. Use this skill whenever the user says they have edited, annotated, marked up, reviewed, or left notes or questions in a plan file, or says things like "check the plan", "I added some notes", "I marked a few spots", "take another look at the plan", or invokes /check-plan — even if they never mention the annotation syntax by name.
---

# check-plan

The user iterates on plans by editing the plan markdown file directly in their editor. They rewrite parts, delete parts, and leave inline annotations where they want something changed. This skill picks the file back up, works through what they marked, and returns a revised plan.

The point of the loop is that the plan file is _theirs_. Treat their prose as the source of truth and change as little as possible beyond what the annotations ask for. If they come back to the file and find their wording rewritten, the loop breaks down.

## 1. Find the plan file

In order of preference:

1. A path the user named in this conversation.
2. The plan file already being discussed or written in this session.
3. The most recently modified plan-looking markdown file: `PLAN.md`, `plan.md`, `*-plan.md`, or anything under `plans/`, `docs/plans/`, `.claude/plans/`. Check modification times rather than guessing by name.

If more than one candidate looks plausible, name them and ask which one instead of picking.

## 2. Read what changed

Read the **whole file** — the annotations only make sense in context, and the user may have edited paragraphs without marking them.

If the file is tracked by git, also run `git diff -- <plan-file>` (and `git diff HEAD -- <plan-file>` if changes are staged). The diff shows edits that carry no marker: deleted steps, reordered sections, a constraint tightened from "should" to "must". Those are instructions too, even without a `(?)` or `(! ...)` next to them. If git shows nothing (untracked file, or already committed), rely on the annotations alone and on comparing the file against what you understood the plan to be.

## 3. Collect the annotations

Scan for two markers.

### `(?)` — explain this better

The user does not understand this part, or thinks it is too thin to act on. It applies to whatever unit of text it sits in: the paragraph, the list item, or — if it stands alone under a heading — the whole section.

Expand it. What "expand" means depends on why it is thin:

- **Vague step** → name the actual files, functions, commands, or data involved.
- **Unexplained choice** → give the reasoning and what the alternative was.
- **Hand-waved mechanism** → describe how it actually works, in enough detail to implement.
- **Unclear scope** → state what is in and what is out.

Look at the code before expanding. A `(?)` on "refactor the auth middleware" is answered by reading the middleware and describing the real refactor, not by writing a longer sentence about refactoring in general.

A `(?)` may also carry a specific question — `(? why not just cache this)`. Then answer that question specifically, in the plan text.

### `(! Note: ...)` — an instruction to fold in

Everything from `(!` to the matching close paren is the user talking to you about the plan. Treat variants leniently: `(! Note: ...)`, `(!Note: ...)`, and a bare `(! use the existing queue here)` all mean the same thing. A note may run over several lines.

Notes are directives, not commentary. Apply them:

| Note                                                         | What it means for the plan                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `(! Note: we already have a retry helper in utils/retry.ts)` | Rewrite the step to use it; drop any step that builds a new one.   |
| `(! Note: too big, split this)`                              | Break the step into smaller ones.                                  |
| `(! Note: skip this for now)`                                | Remove the step, or move it to a "Later" / "Out of scope" section. |
| `(! Note: this must happen before the migration)`            | Reorder, and say why the ordering matters.                         |

A note that changes one step often invalidates others. Check the rest of the plan for steps that depended on what just changed, and fix them too — that consistency pass is most of the value of the skill.

### What not to touch

Ignore markers inside fenced code blocks, inline code, and block quotes. `(?)` in a code sample is part of the sample. If in doubt about whether something is an annotation or content, leave it and mention it in your report.

## 4. Decide what you cannot answer

Some `(?)` marks land on things only the user knows: a product decision, an unstated constraint, which of two acceptable designs they prefer.

Do not guess and do not paper over it with plausible-sounding filler — a confidently wrong expansion is worse than no expansion, because the user will read past it. Instead, leave that `(?)` in place, and ask the question directly in chat. The marker survives to the next round, which is exactly what it is for.

Everything you _can_ answer, answer without asking.

## 5. Rewrite the file

Edit the plan in place.

- **Remove every marker you resolved.** The `(?)` and `(! Note: ...)` text disappears and the improved prose stands on its own. A resolved marker left behind makes the next pass ambiguous.
- **Keep unresolved markers exactly where they are.**
- **Preserve the user's structure and voice.** Same headings, same ordering, same style, unless an annotation asked otherwise. Do not restyle, do not "tidy", do not renumber for neatness.
- **Do not rewrite untouched sections.** If a paragraph has no marker and no dependency on something that changed, it stays byte-identical.
- **Match the plan's existing level of detail.** Expansions should read like the rest of the document, not like a separate essay bolted on.

## 6. Report back

Short summary in chat, one line per annotation:

```
Plan updated — docs/plans/search-index.md

(?) "Backfill existing rows"       → spelled out the batch size, the cursor
                                      column, and how to resume after a failure
(! Note: use the existing queue)   → step 4 now enqueues to JobQueue; dropped
                                      the new-worker step, and step 6 no longer
                                      waits on it
(?) "Pick a ranking function"      → left in place, asking below

Question: BM25 or the simpler tf-idf you already have in search/score.ts?
BM25 is better for long documents but means a new dependency — which do you want?
```

Do not paste the revised plan into chat. The user reads it in their editor; that is where they will annotate it again.

## Example

Before, as the user left it:

```markdown
## 3. Cache invalidation

When a document is updated we clear its cache entry. (?)

(! Note: there are two caches now, the CDN one matters more)
```

After:

```markdown
## 3. Cache invalidation

When a document is updated, invalidate both cache layers before the write
transaction commits:

- **CDN (primary concern):** issue a purge for `/docs/:id` via the
  `purgeByPath` helper in `lib/cdn.ts`. Purges are eventually consistent —
  budget ~5s — so the write endpoint must not report success on the purge.
- **In-process LRU:** delete the `doc:{id}` key in `cache/documents.ts`.
  Synchronous, no failure mode worth handling.

If the CDN purge fails, log and continue rather than failing the write; the
entry expires on its own after the 5 minute TTL.
```

Both markers are gone, the CDN is treated as the one that matters, and the expansion names the real helpers rather than restating the original sentence at greater length.

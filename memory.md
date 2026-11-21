# memory.md

Project memory for the Python learning website. Every change gets an entry here, plus the reasoning
behind it, so a later session can rebuild context without reading the whole codebase.

Read this file first; read `PLAN.md` for the forward-looking design.

---

## Project in one paragraph

A Python course website: tracks → lessons → exercises → quizzes → progress. The Python backend
(FastAPI) serves server-rendered pages from Markdown lessons kept in `content/`. Lesson material is
authored from source PDFs, but the site never mentions, links, or exposes that: no PDFs, no
provenance wording, no excerpts. That rule is enforced by `tools/check_content.py`, not by memory.

## Hard rules

1. **Invisibility.** Nothing user-facing may reference PDFs, source documents, excerpts, or original
   texts. Content is cited internally by slug only. Enforced by the content validator in CI.
2. **Files are the source of truth.** Lessons live in `content/**/*.md` with YAML frontmatter and are
   synced to the DB. The DB is a cache for querying, never the place to edit content.
3. **No redundancy.** One markdown renderer, one code highlighter, one card macro, one source of
   ordering. If the same thing exists twice, delete one.
4. **Layering.** `routes → services → repositories → models`. Routes parse HTTP, services hold rules,
   repositories hold SQL, models hold shape.
5. **No PDFs in the repo's runtime.** Extraction output goes to `content/_drafts/` (git-ignored);
   PDFs themselves are never committed and never served.

## Conventions

- Python 3.11+, `uv` for dependencies, `ruff` for lint/format, `mypy` strict on `app/` and `tools/`.
- Tests with `pytest`; test files mirror source paths (`tests/services/test_quiz.py`).
- Lesson files: `content/tracks/<track-slug>/<NN>-<lesson-slug>.md`, `NN` two digits, order = position.
- Lesson slugs are kebab-case and stable; changing a slug is a migration, not a rename.
- Routes are plural nouns and return HTML; actions use `POST` on a verb sub-path (`/complete`).
- Templates: `base.html` + macros in `templates/partials/`. No inline styles, no inline colors.
- CSS: every value comes from `static/css/tokens.css`.
- Commit style: imperative subject, body explains *why*.

## Decisions log

| # | Date | Decision | Why |
| --- | --- | --- | --- |
| D1 | 2026-11-21 | FastAPI + Jinja2 + SQLAlchemy 2 + SQLite | Small surface, typed, server-rendered keeps the front end dependency-free. |
| D2 | 2026-11-21 | Markdown content in files, synced to DB | Editing a lesson needs no Python change; content review happens in diffs. |
| D3 | 2026-11-21 | Provenance hidden and machine-checked | Requirement from the start; a lint gate beats a habit. |
| D4 | 2026-11-21 | No client framework, no build step | A course reader does not need one; avoids duplicated rendering logic. |
| D5 | 2026-11-21 | Anonymous progress (signed cookie) before accounts | Lets the reader work in phase 2 without auth complexity. |
| D6 | 2026-11-21 | No server-side code execution | Running learner code needs isolation; Pyodide in-browser covers exercises safely. |

## Change log

### 2026-11-21 — Planning pass

**Added**
- `PLAN.md` — scope, assumptions, architecture, data model, content pipeline, route table, phases,
  clean-code rules, non-goals, open questions.
- `memory.md` — this file: hard rules, conventions, decisions, change log.

**Not done yet**
- No code, no dependencies installed, no templates, no content. Folder was empty apart from
  `.freebuff/`.

**Next step**
- Phase 0 of `PLAN.md`: project skeleton (`pyproject.toml`, app factory, settings, DB layer,
  base template, tokens, lint/test config, `.gitignore`).

## Where things live

| Path | Meaning |
| --- | --- |
| `PLAN.md` | Design and roadmap. Read before building. |
| `memory.md` | Decisions, conventions, change history. Update after every change. |
| `content/` | Lessons (Markdown + frontmatter). Not created yet. |
| `content/_drafts/` | Importer output awaiting rewrite. Git-ignored. Not created yet. |
| `tools/` | CLI helpers: import, sync, validate. Not created yet. |
| `app/` | FastAPI application. Not created yet. |

## How to run

Nothing to run yet — there is no code in this repository. This section gets real commands in
Phase 0 (`uv sync`, `uv run uvicorn app.main:app --reload`, `uv run pytest`).

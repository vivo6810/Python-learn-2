# Python Learning Website — Plan

Status: planning only. Nothing is implemented yet. Change history lives in `memory.md`.

## 1. What we are building

A website that teaches Python, end to end: tracks → lessons → exercises → quizzes → progress.

Content is authored from source PDFs, but the site must read as an original, self-contained course.
**Provenance is invisible**: no PDF filenames, no "source", "extracted from", "chapter N of", no
"derived from" footnotes, no PDF files served, no PDF viewer, no download links. See §6 for how that
is enforced mechanically rather than by memory.

## 2. Assumed decisions (change them in `memory.md` if wrong)

| Topic | Decision |
| --- | --- |
| Subject | The site teaches the Python language (folder is `Python learn`). |
| "Python based" | The site is *written in* Python — FastAPI backend — and teaches Python. |
| Rendering | Server-rendered Jinja2 templates. No SPA, no Node build step. |
| Database | SQLite + SQLAlchemy 2.0, Alembic migrations. Postgres-ready by config only. |
| Content storage | Markdown files with YAML frontmatter in `content/`, synced into the DB. Files are the source of truth. |
| Accounts | Phase 3. Anonymous progress first (signed session cookie). |
| Hosting | Local / any VPS or container. Note: Freebuff Sites cannot host a Python server, so publishing there later would mean a separate Workers port. |
| Audience | Beginner → intermediate: syntax, types, control flow, functions, data structures, OOP, errors, files, stdlib, testing. |

## 3. Architecture

```
app/
  main.py            # FastAPI app factory, router mounting, static/templates wiring
  config.py          # pydantic-settings; env-driven, one Settings object
  db.py              # engine, session dependency
  models/            # SQLAlchemy models, one module per aggregate
  repositories/      # queries only; no business rules
  services/          # business rules; no SQL, no HTTP types
  routes/            # HTTP in/out only; thin, no logic
  templates/
    base.html        # single layout
    partials/        # macros: lesson_card, quiz_option, pager, sidebar
  static/
    css/tokens.css   # colors, spacing, type scale — the only place raw values live
    css/app.css
content/
  tracks/<track-slug>/<NN>-<lesson-slug>.md
tools/
  import_pdf.py      # offline extraction → draft markdown
  sync_content.py    # validate content/ and upsert into DB
  check_content.py   # provenance + structure validator (CI gate)
tests/
```

Layering rule: `routes → services → repositories → models`. A route never builds a query, a service
never returns a `Response`, a model never imports a service.

## 4. Data model (first pass)

- `track` — id, slug (unique), title, summary, position
- `lesson` — id, track_id, slug (unique per track), title, summary, objectives (JSON list),
  body_md, est_minutes, position, published
- `exercise` — id, lesson_id, position, prompt_md, starter_code, solution_code, tests (JSON list)
- `quiz_question` — id, lesson_id, position, prompt, options (JSON list), correct_index, explanation
- `enrollment` / `lesson_progress` — learner_id, lesson_id, state (`started`/`completed`),
  completed_at, last_seen_at
- `quiz_attempt` — learner_id, lesson_id, score, answers (JSON), created_at

Learner identity in phases 1–2 is an opaque `learner_id` in a signed cookie; phase 3 maps it to a
`user` row so anonymous progress survives sign-up.

## 5. Content pipeline

1. **Extract (offline, dev machine only)**
   `python tools/import_pdf.py --input <file.pdf> --track basics`
   → `content/_drafts/<track>/<NN>-<slug>.md` with frontmatter and a `status: draft` field.
2. **Rewrite** — the draft is a skeleton: de-duplicate, re-sequence, rewrite prose in our own voice,
   add objectives, exercises and quiz items. Never paste extracted text verbatim into a lesson.
3. **Validate & sync**
   `python tools/sync_content.py` — parses frontmatter, checks structure and ordering, upserts by slug,
   soft-unpublishes lessons that disappeared.
4. **Ship** — `content/_drafts/` and any PDF is git-ignored and never copied into `static/`.

Lesson frontmatter contract:

```yaml
slug: variables-and-types
title: Variables and Types
track: basics
position: 2
est_minutes: 12
summary: Store values in names and learn what kind of value each one holds.
objectives:
  - Assign a value to a name
  - Predict the type of a literal
status: published
```

## 6. The invisibility rule, enforced

`tools/check_content.py` fails the build when any of these appear in `content/`, `app/templates/`,
or `app/static/`:

- paths or filenames ending in `.pdf` / `.epub` / `.djvu`
- the words: `pdf`, `e-book`, `ebook`, `excerpt`, `excerpted`, `extracted`, `transcribed`,
  `source document`, `original text`, `scanned`, `OCR`
- attribution phrasing: `adapted from`, `taken from`, `derived from`, `based on the book`,
  `chapter \d+ of`, `see page \d+`

The check runs in `pytest` and as a pre-commit hook, so a stray "from the PDF" cannot reach a page.
Content is cited internally by lesson slug, never by where it came from.

## 7. Pages and routes

| Route | Purpose |
| --- | --- |
| `GET /` | Tracks overview + continue-where-you-left-off |
| `GET /tracks/{track}` | Lesson list with progress and completion state |
| `GET /lessons/{track}/{lesson}` | Lesson reader: objectives, prose, code blocks, exercise, quiz |
| `POST /lessons/{track}/{lesson}/complete` | Mark lesson complete (idempotent) |
| `POST /lessons/{track}/{lesson}/quiz` | Score the quiz, return result + explanations |
| `GET /lessons/{track}/{lesson}/solution` | Reveal reference solution after an attempt |
| `GET /search?q=` | Phase 4: lesson search (SQLite FTS5) |

Interaction is plain form posts with progressive enhancement; no client framework. Exercises in
phase 4 may run in-browser via Pyodide — server-side code execution is explicitly out of scope.

## 8. Phases

**Phase 0 — Foundation.** `pyproject.toml` (uv), FastAPI app factory, settings, SQLAlchemy + Alembic,
base template, design tokens, ruff + mypy + pytest config, `.gitignore`.

**Phase 1 — Content pipeline.** Frontmatter parser, draft importer, sync command, `check_content.py`
with tests. One real track ("Python Basics", ~8 lessons) lands through the pipeline so the shape is proven.

**Phase 2 — Reading experience.** Home, track page, lesson reader, markdown rendering service
(one function, used everywhere), Pygments code blocks, sidebar nav, prev/next, mobile layout.

**Phase 3 — Practice and progress.** Quiz scoring service, cookie-based progress, completion state,
"continue" card. Then accounts and progress migration.

**Phase 4 — Depth.** Exercises with in-browser Pyodide, search, glossary, keyboard navigation,
accessibility pass.

**Phase 5 — Launch readiness.** Dockerfile, caching headers, content lint in CI, smoke tests.

## 9. Clean-code rules for this repo

1. One markdown renderer, one code-block highlighter, one card macro — imported, never re-implemented.
2. Order and titles come from frontmatter; nothing hard-codes a lesson list.
3. Routes contain no SQL and no rendering logic beyond choosing a template and a status code.
4. Every CSS number lives in `tokens.css`; components reference variables only.
5. Content is data, not code: adding a lesson must require zero Python changes.
6. Tests cover services and the content validator; templates are checked by one smoke test per route.

## 10. Non-goals

No PDF library page, no PDF uploads, no admin UI (CLI is the admin), no multi-language tracks at
launch, no server-side code execution, no SPA rewrite, no dependency added for something the stdlib
or an already-installed package does.

## 11. Open questions

1. Where are the source PDFs, and are they licensed for us to rewrite from? (Not needed to build, needed before content work.)
2. Accounts: required from launch, or anonymous progress only until later?
3. Deployment target: local-only, VPS/container, or public hosting?
4. Quiz style: multiple choice only, or also fill-in-the-blank and code reading?

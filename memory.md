# memory.md

Everything a later session needs: what this is, the rules, the decisions and why, and a log of every
change. Read this first; `PLAN.md` holds the forward-looking design.

---

## Project in one paragraph

`pyflow` is a website that teaches Python. The site itself is TypeScript — Next.js App Router,
React, statically generated — and the course content lives as Markdown files in `content/tracks/`.
The course follows the reference book in `source-pdfs/` chapter for chapter: two parts, eighteen
chapters, the same teaching pattern and worked examples, written in this project's own prose. That
material is never committed, never served, and never mentioned anywhere in the product.

## Hard rules

1. **Invisibility.** No page, asset, or metadata may reference where chapter material came from: no
   filenames, no "source", "excerpt", "extracted", no attribution, no document viewer. Content is
   referenced internally by part and chapter slug only.
2. **Files are the source of truth.** Chapters live in `content/**/*.md`; ordering comes from the
   filename prefix. Adding content must never require a code change.
3. **No redundancy.** One content loader (`lib/content.ts`), one markdown renderer
   (`lib/markdown.ts`), one place lesson HTML is injected (`components/Markdown.tsx`), one card
   component, one set of tokens.
4. **Headings only.** The interface does not explain itself in subtitles. Headings, labels, chapter
   titles, and chapter prose; nothing else.
5. **Tokens own the numbers.** Every colour, spacing value, radius, and easing lives in the `:root`
   and `[data-theme="dark"]` blocks of `app/globals.css`. Components reference variables.
6. **Private material stays private.** `source-pdfs/` is git-ignored. Nothing under it is imported by
   application code or copied into `public/`.
7. **Own voice.** Chapters cover the same ground as the reference book but are written for this site;
   no page reproduces its text.

## Conventions

- TypeScript strict; no `any`; types derived from the data shapes in `lib/content.ts`.
- Server components by default. `"use client"` only for pointer, scroll, canvas, and theme state.
- File and folder names kebab-case; components PascalCase.
- Chapter files: `content/tracks/<track>/<NN>-<chapter-slug>.md`, two-digit prefix = order.
- Chapter frontmatter carries `title` only.
- CSS: one stylesheet, section comments, `clamp()` for fluid sizing, `prefers-reduced-motion` honoured.
- Commit style: imperative subject; body explains why.

## Decisions log

| # | Date | Decision | Why |
| --- | --- | --- | --- |
| D1 | 2026-11-21 | The site is built in TypeScript, not Python | Explicit instruction: it teaches Python, it is written in TypeScript. Replaces the earlier FastAPI plan. |
| D2 | 2026-11-21 | Next.js App Router, statically generated | No server needed for reading chapters; every page is prerendered, so hosting is trivial. |
| D3 | 2026-11-21 | Markdown files as the content source | Authoring stays plain text, reviewable in diffs; the app reads them at build time. |
| D4 | 2026-11-21 | No database, no accounts | Nothing in the requested scope needs persistence. Progress, when added, starts local-only. |
| D5 | 2026-11-21 | Hand-written CSS with tokens, no framework | The design is bespoke; a utility framework would add a second vocabulary for the same values. |
| D6 | 2026-11-21 | Canvas liquid field for the hero | Real fluid motion with no animation dependency and no video weight; respects reduced motion. |
| D7 | 2026-11-21 | `highlight.js` for code, registered per language | Keeps the bundle small: only Python, Bash, and plain text are shipped. |
| D8 | 2026-11-21 | Theme written to `<html>` by an inline script before paint | Prevents the light flash a React-only toggle would cause on load. |
| D9 | 2026-11-21 | Source material lives in `source-pdfs/` | One known place for private input, outside version control and outside the build. |
| D10 | 2026-11-21 | Course structure mirrors the book: two parts, eighteen chapters | The whole book is the syllabus, so everything it teaches has a page. Part and chapter numbers are content, not code: `track.json` holds `part`, filenames hold order. |
| D11 | 2026-11-21 | Chapters are rewritten in this project's voice | Full coverage of the material without shipping copied text; each chapter keeps the book's pattern of concept, program, explanation, practice. |
| D12 | 2026-11-21 | Chapters numbered continuously across parts in the loader | One number per chapter that matches the book's own ordering; every page, the sidebar, and the pager read it from a single place. |

## Change log

### 2026-11-21 — Project scaffold and first course build

**Added**

- `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore` — Next.js 15.5, React 19,
  TypeScript strict; `source-pdfs/` and build output ignored.
- `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/tracks/[track]/page.tsx`,
  `app/lessons/[track]/[lesson]/page.tsx`, `app/not-found.tsx`, `app/icon.svg`.
- `components/SiteHeader.tsx`, `ThemeToggle.tsx`, `FluidCanvas.tsx`, `TrackCard.tsx`, `Reveal.tsx`,
  `Markdown.tsx`.
- `lib/content.ts`, `lib/markdown.ts`.
- `source-pdfs/Automate the Boring Stuff with Python.pdf` — private reference material. Git-ignored;
  not read by the app.

### 2026-11-21 — Whole-book course, website presentation

**Changed**

- Content now covers the reference book end to end: thirteen chapters became eighteen. New chapters:
  Working with PDF and Word Documents (13), Keeping Time, Scheduling Tasks, and Launching Programs
  (15), Sending Email and Text Messages (16), Manipulating Images (17), Controlling the Keyboard and
  Mouse with GUI Automation (18).
- `content/tracks/automation/` files renumbered 07–14 so their prefixes are real chapter numbers;
  chapter 14 sits after the new chapter 13.
- Chapter titles now match the book's chapter titles (e.g. *Dictionaries and Structuring Data*,
  *Pattern Matching with Regular Expressions*, *Working with Excel Spreadsheets*).
- `track.json` grew a `part` field: `I` for foundations, `II` for automation, with the book's part
  titles.
- `lib/content.ts` numbers chapters continuously across parts and returns them on every lesson
  (`chapter`); `getLesson` and `getLessonNeighbours` now read from the numbered track list.
  Removed the unused `getLessonCount`.
- Part page and chapter page show part numerals and chapter numbers; sidebar rows carry the chapter
  number; pager labels read "Chapter NN".
- Home page section reads `Parts`, and each card shows `Part I/II` and its chapter count.
- `app/tracks/[track]/page.tsx` lost its inline padding style in favour of `.track-page`.
- `next.config.ts` allows the current preview host.

**Verified**

- `npx next build` succeeds; all routes prerender.

**Next step**

- Local progress memory (last chapter opened), in-browser exercises, compile-time search.

### 2026-11-21 — Chapters expanded to full depth; display fixes

**Changed**

- Every chapter rewritten from a summary into full section coverage in the same voice: concept, code,
  gotchas, practice. Word count per chapter rose from ~450–650 to ~1,050–1,900 (9.3k → 23.8k total).
- New automation chapters first (13, 15–18), then 07–12 and 14, then foundations 01–06. Added the
  sections those chapters were missing: PDF decryption/rotation/overlay/encryption, docx runs and
  tables, `sys.argv` projects; timedeltas and format codes, `wait`/`poll`/`terminate`, cron;
  `starttls` vs `SMTP_SSL`, attachments, IMAP flags/expunge, email parsing; colour modes, paste
  masks, `textbbox`, EXIF orientation, batch watermarking; pyautogui permissions, tweens, failsafe,
  `locateAllOnScreen`, wait loops; CSV dialects/encodings and JSON options; regex laziness/anchors
  and flags; `pathlib`, `shelve`, atomic writes, zip safety; dry runs and the date-rename project;
  `breakpoint()`/pdb, exception chaining, rotating logs; scraping caching/retries; openpyxl charts,
  styles, `data_only`; foundations additions: truthiness, mutable defaults, scope, tuples, aliasing,
  `setdefault`, string padding and `secrets`.

**Fixed**

- `--font-mono` was defined as `var(--font-mono)`: a self-reference, so every `var(--font-mono)`
  declaration was invalid and inline code, kickers and labels fell back to Inter Tight. The Next font
  variable is now `--font-jetbrains`, and the token points at it. Inline code keeps its mono face;
  padding tightened to `0.1em 0.32em` and `white-space: nowrap` replaced with `overflow-wrap` so long
  identifiers wrap instead of overflowing.
- `.lesson` at ≤900px computed to a 666px track inside a 417px shell: a `1fr` track still respects the
  aside's min-content. Now `minmax(0, 1fr)` with `min-width: 0` on the grid items and nav, so the
  chapter column and sidebar fit a phone and the page no longer scrolls sideways.

**Verified**

- `npm run build` passes, 25 static pages.
- Browser review at 1440×900 and 390×844, light and dark: home, part pages, and chapters 06, 07, 13,
  15, 17. No horizontal overflow on any checked route; tables and code blocks scroll inside their
  own boxes.

**Next step**

- Local progress memory (last chapter opened), in-browser exercises, compile-time search.

### 2026-11-21 — Duotone palette, progress memory, course search, deeper chapters

**Changed**

- Colour system reduced to two primaries and nothing else. `--ember`, `--teal`, and the three `--glow-*`
  tints are gone; `--primary` (deep teal, mint in dark), `--primary-2` (indigo, periwinkle in dark),
  `--on-primary`, and `--field-1/--field-2` (tints of the two primaries for the hero field) replace
  them. Every hover fill is a flat colour rather than a gradient, so no orange wash remains anywhere.
- `FluidCanvas` keeps its five blobs, paths, timings, pointer pull, and reduced-motion behaviour
  untouched; only its palette source changed, from three glow tokens to the two field tokens. Blob
  colour indices were folded onto those two.
- Local progress memory, no server and no account: `lib/progress.ts` stores read lesson keys and the
  last opened chapter in `localStorage`; `components/useProgress.ts` reads it and re-renders on a
  `pyflow:progress` event and on cross-tab `storage` changes.
- `LessonAside` records a chapter as read on open, shows the part's progress bar, and marks read
  chapters in the sidebar. `LessonList` adds the bar and a read dot to the part page. `TrackCard`
  shows `n / m read`, and `StartLink` resumes the last opened chapter instead of always starting at
  chapter one.
- Course search in the header. `getSearchIndex()` in `lib/content.ts` builds an entry per chapter
  from its title, its `##` headings, and a description cut from its opening paragraph (markdown
  stripped). `components/SiteSearch.tsx` ranks title matches above heading and description matches,
  requires every typed word to appear somewhere, highlights the matched words, closes on Escape,
  outside click, or navigation, and shows a fixed full-width panel on phones.
- The search field would zoom the page on mobile because its text was 11px; the mobile input is now
  16px. The mobile results panel is fixed between the page gutters so it cannot hang off-screen.
- Every chapter gained two new sections, written in the established voice and placed before the
  closing exercises. Word count rose from 23,831 to 33,044 (per chapter 1,472–2,403, was
  1,045–1,868). New ground includes the shell/file/script split and number tools (01), nested loops
  and random choices (02), recursion and function documentation (03), comprehensions and loop
  replacements (04), merging/copying and `Counter` (05), number formatting and encodings (06),
  lookarounds and regex recipes (07), text/binary modes and temporary files (08), sortable
  timestamps and tar archives (09), production logging and profiling (10), sessions/retries and
  JavaScript-rendered pages (11), formulas versus cached values and sheet dimensions (12), PDF
  metadata/forms and Word run-level replacement (13), streaming large files and cleaning passes
  (14), time zones and parsing wild dates (15), IMAP search syntax and deliverability (16),
  transparency/compositing and web export settings (17), screenshot recognition and clipboard
  dialogs (18).

**Verified**

- `npm run build` passes: 25 static pages, first load JS 109 kB.
- Browser, light and dark, 1440×900 and 390×844: home, `/tracks/foundations`, and the Dictionaries,
  Manipulating Strings, Regular Expressions, and PDF chapters. No horizontal overflow on any
  checked route.
- Search returns the Dictionaries chapter for "dictionary", three chapters for "files", two for
  "loop", and the empty state for a nonsense query. Progress counts update across the part page,
  track cards, and sidebar after opening a chapter.

**Next step**

- In-browser exercises, and a compile-time search that also covers body text rather than titles,
  headings, and openings.

### 2026-11-21 — Next.js 16 upgrade and Workers build fix

**Changed**

- `next` 15.5.29 → 16.4.6. The Sites build stopped at the first step because Next 15 is past its
  two-year support window and the Workers build refuses unsupported versions; 16.4.6 is a version
  `@opennextjs/cloudflare` 1.20.12 supports (`>=16.4.1`). `package-lock.json` follows.
- Next 16 reconfigured `tsconfig.json` on the first build (`jsx: react-jsx`, `.next/dev/types`
  added to `include`); the app already awaited `params`, so no page code needed changing for the
  major bump.
- Both dynamic routes now export `dynamicParams = false`. Without it a mistyped course URL was
  rendered on demand inside the Worker, where `lib/content.ts` cannot read `content/tracks` — the
  request failed with a 500 and an `ENOENT ... /bundle/content/tracks` log. All 24 routes are
  generated at build time, so anything else is now a plain 404.

**Verified**

- `npm run build` passes on Next 16 (Turbopack): home static, 20 chapters and 2 part pages
  prerendered.
- `sites_prepare_next` completes with the OpenNext adapter; the built Worker runs under
  `wrangler dev`: `/`, `/tracks/foundations`, `/tracks/automation`, the Dictionaries and PDF
  chapters return 200 with correct titles, CSS is served as `text/css`, and an unknown chapter URL
  returns 404 after the `dynamicParams` change.
- The Files-style 404 fallback was re-checked only through the Worker; the deployed preview has not
  been visited yet.

**Next step**

- Deploy the prepared build to the Sites preview and open it in a browser.

### 2026-11-21 — Next.js 16, deeper chapters, no scroll label

**Changed**

- `next` 15.5.29 → 16.4.6, the first version the Workers adapter (`@opennextjs/cloudflare` 1.20.12)
  accepts. Next 15 is past its support window, so the Sites build refused it before compiling.
  Next 16 reconfigured `tsconfig.json` (`jsx: react-jsx`, `.next/dev/types`); no page code needed
  changing because `params` was already awaited.
- Both dynamic routes export `dynamicParams = false`. Without it a mistyped course URL was rendered
  on demand inside the Worker, which cannot read `content/tracks`, and returned 500. Every route is
  generated at build time, so anything else is now a 404.
- Every chapter gained two closing sections before its exercises: "Doubts worth settling" (six or
  seven questions that are specific to that chapter, each answered in plain terms) and "A slow read
  of one script" (a short, realistic script followed by a line-by-line explanation). The chapters
  now total 40,342 words, from 33,044; the smallest chapter is 1,959 and the largest 2,908.
- The landing hero no longer shows the "Scroll" label or the animated drip line beside it. Both the
  markup and the `.hero__scroll` / `@keyframes drip` styles were removed; the start button is now the
  only item in the hero foot.

**Verified**

- `npm run build` passes on Next 16 (Turbopack): home and 404 static, 20 chapters and 2 part pages
  prerendered.
- `sites_prepare_next` completes; the built Worker under `wrangler dev` serves `/`, both part pages
  and sample chapters with 200 and correct titles, CSS as `text/css`, and 404 for an unknown chapter.
- Word counts and the removed hero label were checked with `wc -w` and by reading the rendered home
  page markup; the deployed preview has not been visited.

**Next step**

- Deploy the prepared build to the Sites preview and open it in a browser.

### 2026-11-21 — Bug fixes: cross-part pager, lint, no-JS reveal, theme bootstrap

**Fixed**

- The chapter pager now crosses part boundaries: `getLessonNeighbours` flattens the course-wide
  numbered list instead of one part, and the pager links use the neighbour's own track (previously
  chapter 06 had no "next" and 07 no "previous", and a cross-part link would have pointed at the
  current track).
- `npm run lint` works again: Next 16 removed `next lint`, so the script now runs ESLint 9 with a
  flat config (`eslint.config.mjs`) extending `eslint-config-next` core-web-vitals and typescript.
  Fixes required by the new `react-hooks/set-state-in-effect` rule: progress and theme state moved
  to `useSyncExternalStore` with an invalidated snapshot cache in `lib/progress.ts`, and the search
  panel closes on navigation by adjusting state during render. The generated
  `freebuff.open-next.config.ts` is excluded from lint; `_body`-style omissions are allowed via
  `ignoreRestSiblings`.
- `.reveal` only hides content when JS is running: the theme bootstrap inline script now adds a
  `js` class to `<html>` before paint and the `.reveal` hidden styles are scoped to `html.js`, so
  no-JS visitors see the home page instead of a blank one.
- `ThemeToggle` no longer throws when storage is blocked (setItem is caught) and still applies the
  theme for the session.
- `FluidCanvas` no longer teleports its colour fields when a tab regains focus; hidden time shifts
  the animation clock forward instead of resetting it to zero.
- Content validation is fail-loud: a `.md` file in a chapter folder that doesn't match `NN-slug.md`
  now throws at build time instead of silently vanishing from the course. `loadLessons` only reads
  tracks discovered on disk, closing the raw-param path traversal.
- `describe()` in the search index no longer throws away the whole prefix when there is no space in
  the first 170 chars, and skips blocks whose stripped text is empty.
- Search panel semantics: `role="list"` with `role="listitem"` links (was `listbox` without
  options). PLAN.md now says Next.js 16.

**Verified**

- `npm run typecheck` and `npm run lint` pass clean; `npx next build` passes (24 routes prerendered;
  font fetch stubbed locally because this sandbox cannot reach Google Fonts — the deployed build is
  unaffected). Cross-boundary neighbours, the fail-loud content guard, and search entries checked
  with a loader probe.

## Where things live

| Path | Meaning |
| --- | --- |
| `PLAN.md` | Design, structure, phases. |
| `memory.md` | This file: rules, decisions, history. |
| `content/tracks/` | Parts, chapters, and part metadata — the source of truth. |
| `source-pdfs/` | Private input material. Git-ignored, never served. |
| `app/` | Routes, layout, and all styling. |
| `components/` | Shared UI, each file one job. |
| `lib/` | Content loading and markdown rendering. |

## How to run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static build, also type-checks
npm run typecheck  # tsc --noEmit
```

## Source material

PDFs go in `source-pdfs/` (workspace path: `/workspace/chats/65edc73db7e2c002c489a98e/source-pdfs/`).
Nothing generated from them is committed, and chapters are rewritten in this project's own voice
rather than copied. The book's structure is two parts and eighteen chapters; that structure is what
the site mirrors.

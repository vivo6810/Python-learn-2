# pyflow — plan

A site that teaches Python. The site is written in TypeScript; the language it teaches is Python.
Change history and decisions live in `memory.md`.

## 1. What exists

A complete course, presented as a website: a landing page, two parts covering eighteen chapters, a
chapter page per chapter, light and dark themes, and a liquid canvas animation behind the hero.
Chapters are Markdown files with frontmatter, loaded from disk at build time and rendered to HTML.

The course follows the structure of the reference book in `source-pdfs/`: the same two parts, the
same eighteen chapters in the same order, the same teaching pattern — a concept, a short program,
what each line does, then practice questions. The prose is written for this site, not copied.

## 2. Stack

| Topic | Decision |
| --- | --- |
| Framework | Next.js 15 App Router, React 19, TypeScript strict |
| Rendering | Static generation (`generateStaticParams`); no database, no API routes |
| Content | `content/tracks/<track>/<NN>-<slug>.md` with YAML frontmatter, plus `track.json` |
| Markdown | `gray-matter` for frontmatter, `marked` for HTML, `highlight.js` for code |
| Styling | Hand-written CSS with design tokens in `app/globals.css`; no CSS framework |
| Motion | CSS keyframes + a Canvas 2D liquid field; one small `IntersectionObserver` reveal |
| Runtime deps | `next`, `react`, `react-dom`, `gray-matter`, `marked`, `highlight.js` |
| Source material | `source-pdfs/` — private, git-ignored, never served, never referenced by the site |

## 3. Layout

```
app/
  layout.tsx              # fonts, theme bootstrap, header, footer
  page.tsx                # hero, chapter marquee, part cards, closing link
  globals.css             # tokens + every component style
  tracks/[track]/page.tsx # part page and its chapter list
  lessons/[track]/[lesson]/page.tsx
  not-found.tsx
components/
  SiteHeader.tsx          # sticky header, scroll state
  ThemeToggle.tsx         # light/dark, persisted
  FluidCanvas.tsx         # animated hero backdrop
  TrackCard.tsx           # part card with pointer-following glow
  Reveal.tsx              # scroll reveal
  Markdown.tsx            # the one place lesson HTML is injected
lib/
  content.ts              # the only reader of content/, numbers chapters across parts
  markdown.ts             # the only markdown renderer
content/tracks/<track>/{track.json,NN-slug.md}
source-pdfs/              # PDFs and extraction output; git-ignored
```

## 4. Content contract

`track.json`:

```json
{ "slug": "foundations", "title": "Python Programming Basics", "part": "I", "order": 1 }
```

Lesson frontmatter holds `title` only. Order comes from the two-digit filename prefix, the slug from
the rest of the name, and the part from the folder. `lib/content.ts` numbers chapters continuously
across parts, so chapter 07 is the first chapter of part two and every page can show the same number.
Adding a chapter is a file drop with no code change.

## 5. The invisibility rule

Nothing user-facing may mention where the material came from: no filenames, no "source", no
"excerpt", no attribution, no document viewer, no download. Content is cited internally by slug.
`source-pdfs/` is git-ignored and is never imported by application code.

## 6. Routes

| Route | Page |
| --- | --- |
| `/` | Hero, chapter marquee, part cards |
| `/tracks/[track]` | Part title and chapter list |
| `/lessons/[track]/[lesson]` | Chapter, sticky chapter nav, previous/next |

## 7. Design system

- Colour: warm paper and ink, one ember accent, a muted teal; both themes defined as CSS custom
  properties, the theme written to `<html data-theme>` before paint to avoid a flash.
- Type: Instrument Serif for display, Inter Tight for prose, JetBrains Mono for code and labels.
- Layout: one `--max` column, fluid `clamp()` spacing, no fixed breakpoints beyond two layout shifts.
- Motion: hero lines rise through a mask, colour fields drift on a sine field and lean toward the
  pointer, cards lift and glow, chapter rows fill from the bottom, scroll reveals fade blocks in.
  Everything collapses under `prefers-reduced-motion`.

## 8. Copy rule

The interface carries headings only. No subtitles explaining what the site is or what to do:
the heading, the chapter titles, labels, and the chapters themselves.

## 9. Next phases

1. Progress: remember the last chapter read, per browser, without accounts.
2. Exercises: runnable Python in the browser, so a chapter can end in practice rather than a list.
3. Search across chapters, built at compile time.
4. Appendices: installing third-party modules, running programs, answers to the practice questions.

## 10. Non-goals

No accounts, no database, no admin panel, no server-side code execution, no client state library,
no PDF or document surface anywhere in the product.

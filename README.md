# pyflow — learn Python

A free, self-contained course in Python, from the first expression to scripts that do the work for you.
Statically exported and deployed to GitHub Pages; the Python examples in every lesson are runnable and
editable directly in the browser.

**Live site:** https://vivo6810.github.io/Python-learn-2/

## What's inside

- **Foundations** — variables, flow control, functions, lists, dictionaries, loops, strings, errors
- **Automation** — files, folders, scraping, spreadsheets, PDFs and Word docs, CSV/JSON, email, time,
  images, and GUI automation
- **Run Python in the page** — every `python` code block in a lesson is editable and runnable
  (Pyodide — CPython compiled to WebAssembly — fetched from a pinned CDN on the first run, executed
  in a Web Worker, so code never leaves your machine and a hung loop can't freeze the page). There is
  also a separate [`/playground`](https://vivo6810.github.io/Python-learn-2/playground/) for writing
  your own `.py` files in the browser, with download/open support. No JS → the highlighted code
  still renders.

## Requirements

- Node.js 22 (as used by the deploy workflow)
- npm 10+

```bash
npm ci
npm run dev        # local dev server
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Data and content

Lessons live in `content/tracks/<part>/<chapter>.md` (with `track.json` per part) as plain
markdown — the source of truth. The search index, navigation, and static routes are generated from
it at build time (`lib/content.ts`, `lib/markdown.ts`). Editing a chapter requires only a rebuild.

```
app/                 routes (home, /tracks/[track], /lessons/[track]/[lesson], /playground)
components/          shared UI (one job per file)
content/tracks/      the course, markdown + track.json
lib/                 content loading, markdown → highlighted figures, Pyodide runner
```

## Static export

`next.config.ts` sets `output: "export"`, `basePath: "/Python-learn-2"` and `trailingSlash: true`.
`npm run build` prerenders everything into `out/` — there is no server-side rendering, no API
routes, and `next start` is not used. The base path is tied to the repository name
(`https://<user>.github.io/<repo>/`); if the repository is renamed, or a custom domain is attached,
update `basePath` in `next.config.ts` (for a root domain such as `<user>.github.io` or a custom
domain, remove `basePath` entirely).

`public/.nojekyll` is included so GitHub Pages serves the `_next/` asset directory.

## Publishing to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the static export and publishes `out/` with
`actions/deploy-pages` on every push to `main` (and on-demand via **Run workflow**).

One-time setup the repository owner must do — the deploy **fails at the
`actions/configure-pages` step until you do**:

1. Go to **Settings → Pages**
2. Under **Build and deployment → Source**, select **GitHub Actions** (not "Deploy from a branch")
3. Re-run the failed workflow: **Actions → Deploy to GitHub Pages → Re-run jobs**
   (or from a clone: `gh workflow run deploy.yml --ref main`)

After that, any push to `main` publishes automatically:

```
push → main ──▶ workflow: npm ci → npm run build (Google Fonts are reachable from the runner)
                ──▶ upload out/ ──▶ actions/deploy-pages ──▶ live at
                 https://vivo6810.github.io/Python-learn-2/
```

Notes:

- The site is static; there is no backend to run or patch. Republishing == rebuilding.
- Everything browser-side (search, theme, the Pyodide runners) needs JavaScript; the Pyodide
  runtime is downloaded from the jsDelivr CDN on the first Run click and cached by the browser.
- The one-time toggle above is a repo-owner permission; the deploy uses the default `GITHUB_TOKEN`
  (`pages: write`, `id-token: write`) granted in the workflow.

## Working on it

See `memory.md` for rules and a change log, and `PLAN.md` for design and phases. Content style:
plainer language, worked examples, keep the existing voice, filename-prefix ordering.

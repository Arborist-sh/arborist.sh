# arborist.sh

A [Best Coast Software LLC](https://bestcoast.dev) project. The website for [Graft](https://github.com/Arborist-sh/graft): landing page + docs, served at
[arborist.sh](https://arborist.sh).

- **Landing page** — `src/pages/index.astro`. Plain Astro, fully custom, no docs chrome.
- **Docs** — `src/content/docs/docs/*.md`, rendered by [Starlight](https://starlight.astro.build).
  Sidebar order lives in `astro.config.mjs`. Theme tokens in `src/styles/theme.css`.
- **Hosting** — static build in `dist/`, served as an assets-only Cloudflare Worker
  (`wrangler.jsonc`) on the `arborist.sh` and `www.arborist.sh` custom domains.
- `design/mocks/` — the three throwaway direction mocks the landing page was picked from.
- `social/og.svg` → `public/og.png` — the link-preview image (`rsvg-convert -w 1200 -h 630 -o public/og.png social/og.svg`). bestcoast.dev copies it for its Work card.

## Develop

```sh
npm install
npm run dev        # http://localhost:4321 — hot reload; search only works on a built site
npm run build      # -> dist/
npm run preview    # serve dist/ locally (search works here)
```

## Deploy

```sh
npm run deploy     # astro build && wrangler deploy
```

Needs a Cloudflare login (`wrangler login`) or `CLOUDFLARE_API_TOKEN` in the environment.

## Docs conventions

Pages are Markdown with `title` and `description` frontmatter. Headings start at `##`.
Every command is checked against the installed `graft` binary, not the README — the repo
docs drift. Vocabulary: seed = `.graft` recipe, sapling = golden image, nest = dev box,
leaf = VM, tree = Orchard fleet, arborist = the runner supervisor.

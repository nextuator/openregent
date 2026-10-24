# Glowup: project brief for Claude Code

Hackathon build, Vibe Code Fest Basel, 24 Oct 2026. **Feature freeze 17:45.** Working beats complete: build phase by phase, and after every phase the app must run and be demoable.

If anything here conflicts with DESIGN.md on visual matters, DESIGN.md wins.

## What the product does

You enter the URL of a local business's website. Glowup then:

1. opens the site in a real cloud browser (Gaffa),
2. **measures** its design from the real CSS and DOM (the audit),
3. sets a design direction as **target marks** on 7 axes,
4. turns that direction into **one set of design tokens**,
5. generates **three outputs from those same tokens**: a redesigned homepage, a social post and a presentation slide.

The original and the redesign are shown side by side.

The method comes from a talk at the event, and we reproduce it faithfully:
**Audit → Target marks → Design tokens → One source of design.**

## Non-negotiables

1. **Measured, not guessed.** Every number in the audit comes from code that parses real CSS and DOM, never from the LLM. The LLM interprets measurements and scores only the copy-based axes.
2. **Two token systems, never mixed.**
   - *App tokens* (DESIGN.md → `app/globals.css` `@theme`) style the Glowup UI only.
   - *Shop tokens* are generated per run. They are named `--color-*`/`--font-*`/… inside the generated homepage document (an isolated iframe), and `--shop-*` on a `[data-shop-scope]` wrapper for the post and slide previews.
   - App components never read `--shop-*`. Shop previews never use app colour or type classes.
3. **Content truth.** Generated pages, posts and slides use only text, images and facts scraped from the shop's own site. Never invent prices, reviews, testimonials, ratings, awards, founding years, staff names or numbers. If the information is missing, omit the section.
4. **Concept, not impersonation.**
   - Every generated homepage carries a fixed banner: `Concept redesign by {APP_NAME}. Not affiliated with {brand}.` It also carries `<meta name="robots" content="noindex">`.
   - Generated pages are only ever rendered inside our UI (iframe `srcdoc`) and never get their own URL.
5. **Tokens are enforced in code.** Generated CSS and inline styles may not contain colour literals or font families outside the tokens.
   - Validate every output.
   - On a violation, retry once with the list of violations.
   - If violations remain, map each remaining literal to the nearest token colour (culori, ΔE).
6. **Secrets come only from env:** `GAFFA_API_KEY`, `ANTHROPIC_API_KEY` (optional), `DEMO_KEY` (optional). Never log them or return them to the client.
7. **Read-only browsing.** Never click, type, fill or submit anything on scraped sites. The only allowed steps are navigate, wait, scroll and capture.

## Stack

- Next.js (App Router, TypeScript, latest stable via `create-next-app`), Tailwind CSS v4.
- Every API route uses `export const runtime = "nodejs"; export const maxDuration = 300;`.
- Deployment target is Vercel Hobby. Functions may run up to 300 s, and request and response bodies must stay under ~4.5 MB, so keep payloads small: JPEG screenshots, capped height.
- Libraries (only these, unless blocked): `@anthropic-ai/sdk`, `zod`, `cheerio`, `culori`, `sharp`, and `html-to-image` (Phase 4 only).
- Storage:
  - Live runs live in client state, plus a `localStorage` cache keyed by URL (wrap it in try/catch).
  - Pre-run demo runs are static files in `public/runs/`.
  - Upstash Redis (REST via fetch, `lib/store.ts`, in-memory fallback locally) holds: per-IP daily limit (3), per-site limit (3), finished glow-ups for the blind vote, vote tallies and the concept bandit stats.

## Config

`lib/config.ts` is the only place these values live:
- `APP_NAME = "Glowup"`
- `APP_URL = "https://glowup.openregent.ai"`

Both are placeholders that may change, so never hard-code them anywhere else.

## File layout

```
lib/
  config.ts
  types.ts        zod schemas + TS types for everything below
  gaffa.ts        capture(url) → Capture
  audit.ts        audit(capture) → Audit                      (deterministic, no LLM)
  llm.ts          complete() / completeJson() provider adapter
  direction.ts    direction(audit, content, viewportJpeg) → Direction   (LLM)
  tokens.ts       tokens(direction, audit) → TokenSet (LLM picks, code validates) ; toCss(tokens, prefix)
  page.ts         page(tokens, direction, content) → html     (LLM, validated, assembled by code)
  pipeline.ts     runAll(url) → Run   (used by the prerun script)
app/
  page.tsx                 home: URL input + gallery of saved glow-ups
  glow/page.tsx            run view (?url=… for live, ?run=slug for saved)
  api/analyze/route.ts     POST {url} → {capture meta, audit, content, screenshots}
  api/direction/route.ts   POST → Direction
  api/tokens/route.ts      POST → {tokens, css}
  api/page/route.ts        POST → html (streamed when provider = api)
scripts/prerun.ts          npm run prerun -- <url> [<url> …]
public/runs/index.json     list of saved runs
public/runs/<slug>/        run.json, before.jpg, before-full.jpg
```

The client orchestrates the steps, calling analyze → direction → tokens → page and holding the results. The server stays stateless.

## Gaffa (browser API)

- **Read the docs first:** https://gaffa.dev/docs/llms.txt, plus the pages it links for browser requests, actions and authentication. Do not guess field names or headers.
- **Expected shape (confirm against the docs):**
  - Endpoint: `POST https://api.gaffa.dev/v1/browser/requests`. It is synchronous by default.
  - Responses are wrapped in a top-level `data` object, and finished requests have `data.state === "completed"`.
- **Actions we need:** wait for the page to load, `capture_screenshot` (viewport 1440×900, plus full page), `capture_dom`, `generate_markdown`. Set an explicit time limit of about 45 s.
- **Before writing the parser,** make one real call with curl to a real small-business site. Save the raw JSON to `data/gaffa-sample.json` (gitignored) and build the parser from that real shape.
- **Screenshots:**
  - They may come back as URLs. Download them server-side.
  - Convert with sharp to JPEG, 1440 px wide, quality 75.
  - Cap the full-page image at 6000 px tall.
  - Record the true page height.
- **Fallback:** if Gaffa fails, show this error and point to the saved glow-ups: "Couldn't open that site. Check the address or pick a saved glow-up below."

## LLM adapter (`lib/llm.ts`)

```
complete({ system, prompt, image?: {base64, mediaType}, tier: "fast" | "smart", maxTokens, stream? })
  → Promise<string> | AsyncIterable<string>
completeJson(schema, opts)
  → extract the first {...} block, validate with zod; on failure retry once with the zod error appended
```

Provider selection:
- **`ANTHROPIC_API_KEY` set** → use the Anthropic Messages API via `@anthropic-ai/sdk`.
  - Models: fast = `claude-haiku-5-5`, smart = `claude-sonnet-5-5`. Allow overrides via `LLM_MODEL_FAST` / `LLM_MODEL_SMART`.
  - Send images as base64 image blocks.
  - Streaming is supported.
- **No key and not on Vercel** (`!process.env.VERCEL`) → use the local Claude Code CLI in headless mode (`claude -p`):
  - Use `--output-format json` and read `.result`.
  - Use a small `--max-turns`, a model alias per tier, and allow only the Read tool.
  - Write the screenshot into a fresh temp dir, use that dir as cwd, and reference the image by absolute path in the prompt.
  - **Run `claude --help` first and use only flags that exist in the installed version.**
  - Timeout is 180 s. No streaming.
- **No key on Vercel** → throw a typed error. The UI shows: "Live glow-ups are off on this deployment. Pick a saved one below."

For each call, log the provider, model and duration. Never log the prompt.

## Audit (`lib/audit.ts`), deterministic

Input: the rendered DOM, the final URL, the markdown and the page height.

1. **CSS sources:**
   - Every `<link rel=stylesheet>`: resolve the URL and fetch it server-side. Limits: 5 s timeout each, at most 12 files, at most 2 MB total.
   - Every `<style>` block.
   - Every `style=""` attribute.
2. **Counts from the CSS text:**
   - **Colour literals:**
     - Count hex (3, 4, 6 and 8 digits), `rgb()`/`rgba()` and `hsl()`/`hsla()`.
     - Normalise each to hex with culori.
     - Cluster near-identical colours (ΔE2000 < 4).
     - Report: total literals, distinct values, and the top 12 clusters, each with its count and sample raw values.
   - **`font-family`:** take the first family of each declaration, with counts. Flag system and default stacks (Arial, Helvetica, Times, generic `sans-serif`/`serif` only, `system-ui`).
   - **`font-size`:** convert values to px (rem/em × 16), with counts. Also count `font-weight` and `line-height` values.
   - **Radii and shadows:** count distinct `border-radius` values, and distinct `box-shadow` values that aren't `none` (these are the "shadow levels"). Also count gradients.
   - **Fonts:** list any Google Fonts families linked.
3. **Page facts:**
   - Title, meta description, h1 texts, viewport meta and `lang`.
   - Nav link texts from header/nav.
   - Images: absolute `src` and `alt`. Skip icons, tracking pixels and anything under 40 px. Keep at most 20.
   - Logo candidate: an img or svg whose src, alt, class or id contains "logo"; otherwise the first header img.
   - Contact details:
     - Phone: from `tel:` links and a regex.
     - Email: from `mailto:` links.
     - Address lines.
     - Opening hours: lines with DE, EN or FR day names or abbreviations.
   - Social links.
4. **Density:**
   - Visible text characters (from the markdown) per 1000 px of page height.
   - Body font size: the most frequent size on body or p; otherwise the most frequent size overall.
5. **Health checks** (the "does Google see you" slide):
   - HTTPS.
   - Title present, and its length.
   - Meta description present.
   - Exactly one h1.
   - Viewport meta present.
   - Alt-text coverage %.
   - robots.txt reachable, and not `Disallow: /` for `*`.
   - sitemap.xml reachable.
   - 5 s timeout per check.
6. **Measured hints** for 4 axes, as short strings with numbers that the LLM must cite:
   - `warm_cool`: weighted mean hue and saturation of the top clusters. Warm is 0–70° and 300–360°; cool is 170–280°.
   - `systematic_crafted`: number of font families, distinct radii, and whether the fonts are system defaults.
   - `flat_deep`: shadow levels and gradient count.
   - `dense_airy`: characters per 1000 px and body font size.

## Direction (`lib/direction.ts`), LLM tier "fast"

- **Input:**
  - The audit summary, with measured hints.
  - Content: brand facts, plus the markdown truncated to 6000 characters.
  - The viewport screenshot.
- **Output, zod-validated:**

```
{
  brand: { name, offer (≤12 words), audience (≤10 words), voice (≤10 words) },
  keep:  { primaryHex (from audit clusters or logo), logoUrl | null, why (≤15 words) },
  axes: [ { id, now: 0-100, target: 0-100, basis, change } ] × 7,
  copy: { heroHeadline (≤8 words), heroSub (≤22 words), cta (2-3 words, a real action the site supports),
          ctaHref (tel:/mailto:/a real URL from the site), postHeadline (≤7 words), postLine (≤14 words),
          slideTitle (≤6 words), slideSubtitle (≤14 words) }
}
```

- **Axes** (0 = left label, 100 = right label):
  - `warm_cool`: Warm ↔ Cool
  - `systematic_crafted`: Systematic ↔ Crafted
  - `flat_deep`: Flat ↔ Deep
  - `enthusiastic_rational`: Enthusiastic ↔ Rational
  - `formal_informal`: Formal ↔ Informal
  - `funny_serious`: Funny ↔ Serious
  - `dense_airy`: Dense ↔ Airy
- **`basis`:**
  - For the 4 measured axes it must start with `measured:` and cite the numbers.
  - The other 3 start with `reading of copy:` or `screenshot:`.
- **`change`:** one concrete sentence in the talk's style, e.g. "Swap the cool slate greys for warm neutrals and one warm accent."
- **Targets keep the business recognisable:** keep its primary hue and its logo. Glow-up, not rebrand.
- **Copy must be grounded in the scraped content.** No invented facts.

## Tokens (`lib/tokens.ts`)

The LLM (tier "fast") picks:

```
{
  color: { bg, surface, text, textMuted, border, primary, onPrimary, accent, onAccent },
  font:  { display, body },          // from FONT_ALLOWLIST or a Google Font the site already uses
  scale: { base: 16|17|18, ratio: 1.2|1.25|1.333 },
  radius:{ control (0-12), card (0-24) },
  space: { section (56-160) },
  shadow: "none" | "soft",
  mapping: [ { from: ["#a855f7 ×5", …], to: "--color-primary" }, … ]   // raw clusters → semantic token
}
```

- **FONT_ALLOWLIST:** see `FONT_ALLOWLIST` in `lib/tokens.ts` (the original 14 plus about 20 characterful Google fonts, each verified with its weights). The layout concept (`lib/concept.ts`) sets the type pairing and palette mode.
- **Contrast fixes in code (culori, OKLCH; keep the hue, move lightness):**
  - `text`/`bg` ≥ 7:1 if reachable, otherwise ≥ 4.5:1.
  - `textMuted`/`bg` ≥ 4.5:1.
  - `onPrimary`/`primary` and `onAccent`/`accent` ≥ 4.5:1.
- **`toCss(tokens, prefix = "")`** outputs:
  - `--{prefix}color-*`, `--{prefix}font-display`, `--{prefix}font-body`.
  - `--{prefix}text-sm|base|lg|xl|2xl|3xl`, computed as a modular scale.
  - `--{prefix}radius-control|card`, `--{prefix}space-section`, `--{prefix}shadow-card`.
- **`googleFontsHref(tokens)`** builds the CSS2 link.

## Homepage (`lib/page.ts`), LLM tier "smart" (Opus 5.5)

Pipeline: concept (bandit-picked) → art-direction brief → first version (streamed) → deterministic slop lint + token checks + critic model → revision (streamed) → token enforcement in code. Evidence-based rules live in `docs/DESIGN-GUIDE.md` / `lib/design-guide.ts`. Blind votes train a Thompson-sampling bandit over concepts.

- **Input:**
  - Tokens CSS (the variable names only matter).
  - The direction.
  - A content pack: nav, up to 12 images with alt, contact, hours, social links, and the markdown truncated to 8000 characters.
- **The LLM returns exactly two parts:** a `<style>…</style>` block, then the body markup (`<header>…<footer>`). It uses no `<html>`, `<head>` or `<script>`.
- **Prompt rules:**
  - Build from the target marks:
    - `dense_airy` drives spacing.
    - `flat_deep` drives elevation.
    - `systematic_crafted` drives how hand-made the details feel.
  - Use only `var(--…)` tokens.
  - Sections, each omitted when there's no data:
    - header: logo or name, plus up to 5 nav anchors.
    - hero: heroHeadline, heroSub, and the CTA linking to ctaHref.
    - offer: the real menu, services or products.
    - about: the real text, shortened faithfully.
    - visit: address, hours, phone, and a map link (a Google Maps search for the address).
    - footer: name, plus a link to the original site.
  - Mobile-first with one breakpoint at 768 px. Text measure ≤ 70ch.
  - Use only the provided image URLs, with real alt text.
- **Code assembles the document:**
  ```
  <!doctype html><html lang>
  <head>
    meta charset, meta viewport, robots noindex, title
    Google Fonts link
    <style> tokens :root + small reset </style>
    LLM <style>
  </head>
  <body> concept banner + LLM body </body>
  </html>
  ```
- **Validation:**
  - Search for colour literals in the LLM's CSS and inline styles: `#hex`, `rgb(`, `hsl(`, and named colours other than `transparent`/`currentColor`/`inherit`.
  - Any `font-family` must use `var(--font-…)`.
  - Then apply non-negotiable 5.
- **Rendering:**
  - The route streams text when provider = api.
  - The client re-renders the iframe `srcdoc` at most every 800 ms while streaming. Watching it build is a demo moment.
  - The iframe uses `sandbox` without `allow-scripts`.

## Post and slide (Phase 4)

- **Components:** React components inside a `[data-shop-scope]` wrapper that sets `--shop-*` from `toCss(tokens, "shop-")`. Load fonts by injecting the Google Fonts `<link>` on the client.
- **Post (1080×1080):** hero image (the largest real photo), logo or name, `postHeadline`, `postLine`, `cta`.
- **Slide (1920×1080):** `slideTitle`, `slideSubtitle`, hours or address, logo, and one real image.
- **Previews** are rendered at full size and scaled down with `transform: scale()`.
- **Export:** "Download post" and "Download slide" save a PNG via `html-to-image`. This is a stretch goal.

## UI

See DESIGN.md. The run view progress steps are a real sequence, so numbering them is fine:

1. Opening the site in a real browser
2. Measuring the CSS (show live facts as they arrive, e.g. "47 colour literals, 11 distinct, 4 font families, 6 radii")
3. Reading the brand
4. Setting target marks
5. Building the tokens
6. Designing the homepage
7. Applying the tokens to a post and a slide

The results sections, in this order (Before and after is the default):
- Before and after
- Target marks
- Audit
- Tokens
- One source

## Phases

After every phase:
- `npm run build` must pass.
- Commit.
- Tell the user in ≤ 5 lines what to test.

Don't refactor earlier phases unless they're broken. If you're blocked for more than 10 minutes, stop and present options.

- **Phase 0, setup (≤ 5 min):**
  - Run `create-next-app` in this folder. Keep CLAUDE.md, DESIGN.md and app-tokens.css.
  - Install the libraries.
  - Put the `@theme` from app-tokens.css into `app/globals.css`.
  - Load Archivo via `next/font/google` with the `wdth` axis.
  - Create `lib/config.ts` and `.env.local.example`.
  - Add `data/` and `.env*.local` to `.gitignore`.
  - Run `git init`.
- **Phase 1, capture + audit + progress UI:**
  - Make the Gaffa sample call first.
  - Build `/api/analyze`, the home page, and the run view with steps 1–2 live.
  - Build the Audit view.
  - **Done when:** a real URL shows its screenshot and measured audit in under 45 s.
- **Phase 2, direction + tokens:**
  - Build `/api/direction` and `/api/tokens`.
  - Build the Target marks view (see DESIGN.md) and the Tokens view, including the raw → semantic mapping table.
  - **Done when:** all 7 axes show a basis, and the contrast checks pass.
- **Phase 3, homepage:**
  - Build `/api/page` with validation and streaming.
  - Build Before and after: original full-page screenshot vs the iframe, with a Desktop (1280)/Mobile (390) toggle.
  - **Done when:** end-to-end runs work on 2 different sites, no colour literal leaks, and the banner is present.
- **Phase 4, one source:**
  - Build the post and slide components and the One source view: homepage thumbnail, post and slide side by side.
  - Add PNG download if time allows.
- **Phase 5, ship:**
  - Write `scripts/prerun.ts` and run it on the 3 backup URLs the user gives you. Commit `public/runs`.
  - Build the gallery on home.
  - Add the `DEMO_KEY` guard: if it's set, APIs require the header `x-demo-key`, and the UI asks once and stores the key in localStorage.
  - Add error states.
  - Add `robots.txt` and `sitemap.xml` for the app itself.
  - Deploy with the Vercel CLI, set the env vars, and smoke-test the production URL.

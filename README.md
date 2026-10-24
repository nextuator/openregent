# Glowup

**Show any Basel business its better website.** Paste the address of an old shop, Beiz or bakery website. Glowup opens the real site in a cloud browser, measures its design from the actual CSS and DOM, sets a design direction, turns it into one set of design tokens, and generates a redesigned homepage, an Instagram post, a slide and a ready sales email, all from those same tokens.

Live: https://glowup.openregent.ai · Built at the Vibe Code Fest Basel, 24 October 2026.

## How it works

The method follows four steps: **Audit → Target marks → Design tokens → One source.**

1. **Audit (measured, not guessed).** [Gaffa](https://gaffa.dev) captures the page: screenshots, rendered DOM, markdown. `lib/audit.ts` parses the real CSS and counts colour literals (clustered with ΔE2000), font families, sizes, radii, shadows, density and SEO health checks. No LLM is involved.
2. **Target marks.** A fast model (Claude Haiku) reads the measurements and the screenshot and places the site on seven axes (warm↔cool, dense↔airy, …), citing the measured numbers.
3. **Design tokens.** Nine semantic colours, two fonts, a type scale, radii and spacing. Contrast is fixed in code (OKLCH, WCAG AA/AAA) and the palette mode of the chosen art direction is enforced in code.
4. **One source.** Claude Opus writes an art-direction brief, a first version, gets a critic review (plus a deterministic "AI-look" lint and token checks) and revises. Code then enforces the tokens: no colour literals, no foreign fonts, safe links, only the site's own images. The same tokens drive the Instagram post and the slide.

Around it:

- **Pitch it:** an outreach email in the shop's own language, built only from measured findings.
- **Blind vote:** real homepage vs. redesign, revealed at the end. Every vote updates a Thompson-sampling bandit over seven art directions, so the generator learns which directions win.
- **Languages:** Baseldytsch (default), Deutsch, Français, Italiano, Rumantsch, English.

## Rules the code enforces

- Every audit number comes from code, never from the LLM.
- Generated pages use only the business's own text, images and facts. No invented prices, reviews or awards. Sensitive personal news (deaths, illness) is left out.
- Every generated page carries a "Concept redesign by Glowup. Not affiliated with …" banner and `noindex`, and is only rendered inside the app (sandboxed `srcdoc` iframe, no scripts). It never gets its own URL.
- Browsing is read-only: navigate, wait, scroll and capture.
- Limits: 3 live glow-ups per IP per day and at most 3 per website. Failed runs don't count.

## Run it locally

Everything comes from the Nix flake, so no global installs are needed:

```sh
nix develop            # Node 24, git, GitHub CLI, Vercel CLI
npm install
cp .env.local.example .env.local   # add GAFFA_API_KEY and ANTHROPIC_API_KEY
npm run dev
```

Environment variables (see `.env.local.example`):

| Variable | Required | Purpose |
|---|---|---|
| `GAFFA_API_KEY` | yes | Cloud browser capture |
| `ANTHROPIC_API_KEY` | for live runs | Claude API. Without it, local dev falls back to the `claude -p` CLI |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | optional | Shared limits, votes and learning. Upstash's free plan is enough; without it an in-memory store is used |
| `NOTIFY_URL` | optional | ntfy.sh topic, Discord or Slack webhook for billing, quota and server alerts |
| `RUNS_PER_IP_PER_DAY`, `RUNS_PER_SITE` | optional | Limits (default 3 and 3) |
| `DEMO_KEY` | optional | If set, the APIs require the header `x-demo-key` |

Precompute saved glow-ups (used on the home page and in the vote):

```sh
npm run prerun -- https://example-shop.ch                   # capture + full pipeline
npm run prerun -- --reuse --concepts=swiss https://…        # redo tokens + page only
```

## Deploy

```sh
nix develop --command npm run deploy
```

This deploys a copy without git metadata, because Vercel Hobby blocks deploys whose commit author isn't a team member.

## Project layout

```
lib/        gaffa, audit, direction, tokens, page (brief, critic, revision, token enforcement),
            concept (art directions + bandit), store (Upstash REST), guard (limits), i18n
app/        home, /glow run view, /vote, API routes (analyze, direction, tokens, page, vote, limits, img)
components/ run view, audit, target marks, tokens, post and slide, pitch, vote
scripts/    prerun.ts, deploy.sh
docs/       DESIGN-GUIDE.md: the evidence-based design rules fed to the generator and critic
```

Design of the app itself: [DESIGN.md](DESIGN.md). Build brief: [CLAUDE.md](CLAUDE.md).

## Notes

- Redesigns are concepts for pitching, not affiliated with the businesses shown. Images load from the businesses' own sites.
- The Basel mark uses the flag form (black Baslerstab on white), not the cantonal coat of arms, which Swiss law reserves for the canton.

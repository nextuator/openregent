# Prompts to paste into Claude Code

Paste them one at a time and wait until each phase works before sending the next.

## 1. Kickoff (Phase 0 + 1)

```
Read CLAUDE.md, DESIGN.md and app-tokens.css in this folder completely before doing anything.
Hard feature freeze is 17:45 today, so speed beats polish, but the non-negotiables in CLAUDE.md are not optional.

First: if anything blocks you, ask me all blocking questions in one batch (max 5). If nothing blocks you, say "no blocking questions".
Then do Phase 0 and Phase 1 exactly as specified. GAFFA_API_KEY is in .env.local.
Start Phase 1 with the real Gaffa sample call against https://www.example.com and one real small-business site, and build the parser from the saved response.
Stop when Phase 1 works and tell me in max 5 lines how to test it.
```

## 2. Phase 2

```
Phase 1 works. Do Phase 2 per CLAUDE.md (direction + tokens, Target marks view and Tokens view per DESIGN.md).
Check which LLM provider is active (API key or local claude -p) and tell me. Stop when Phase 2 works.
```

## 3. Phase 3

```
Phase 2 works. Do Phase 3 per CLAUDE.md: homepage generation with token validation, concept banner, streaming into the iframe, Before and after view with Desktop/Mobile toggle and the highlighter glow from DESIGN.md.
Test end-to-end on 2 different sites and show me any token violations you had to auto-fix. Stop when Phase 3 works.
```

## 4. Phase 4

```
Phase 3 works. Do Phase 4 per CLAUDE.md: post and slide from the same shop tokens, One source view. PNG download only if it takes less than 10 minutes.
```

## 5. Phase 5 (start no later than 17:25)

```
Do Phase 5 per CLAUDE.md. Backup URLs for prerun: <URL 1> <URL 2> <URL 3>.
Then deploy to Vercel with the CLI, set GAFFA_API_KEY, ANTHROPIC_API_KEY and DEMO_KEY as production env vars, and smoke-test the production URL with one saved and one live glow-up.
```

## Rescue prompts

**Gaffa fails on a site:**
```
Gaffa fails on <URL>. Show me the raw response and the error. Don't change the parser until we've looked at it together.
```

**Redesigns look generic or all alike:**
```
The redesigns look too similar. Show me the target marks and tokens of the last 2 runs side by side. Then tighten the page prompt so layout spacing follows dense_airy, elevation follows flat_deep, the hero uses the shop's own best photo and the type pairing differs when the targets differ. Don't touch anything else.
```

**Behind schedule:**
```
We're behind. Drop streaming, PNG export and the Tokens mapping table. Priority now: one working end-to-end run, prerun backups, deploy.
```

**Something is invented on a generated page:**
```
The generated page shows "<invented text>", which isn't on the original site. Find which prompt allowed it and tighten the content-truth rule. Re-run that site.
```

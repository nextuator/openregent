# Setup: your part (do it while Claude Code builds)

## Before the kickoff prompt (5 min)

1. Create an empty folder, put CLAUDE.md, DESIGN.md, app-tokens.css and PROMPTS.md in it, and open Claude Code there.
2. Create `.env.local` in that folder with your Gaffa key:
   ```
   GAFFA_API_KEY=...
   ```
3. Choose an LLM option for the app. The app itself needs one at runtime; Claude Code building it doesn't count.
   - **Option A (recommended, required for live glow-ups on Vercel):** create an API key in the Anthropic Console, add prepaid credits and set a low spend limit. Then add `ANTHROPIC_API_KEY=...` to `.env.local`.
   - **Option B, no key:**
     - Live glow-ups run only on your laptop, through your logged-in Claude Code (`claude -p`). Check that `claude -p "say ok"` answers in a terminal.
     - The Vercel site then shows only the saved glow-ups, and the live demo happens from `localhost`.
4. Run `npx vercel login` now, so deploying later is one command.

## While Phase 1 and 2 build

5. **Pick 3 backup sites.** Look for real Basel businesses whose sites:
   - visibly look dated (2010s style),
   - have real photos, opening hours and contact details,
   - load fast and aren't a heavy app or behind a cookie wall.

   Mix the types: for example a bakery, a bike shop and a hair salon. Send me the URLs if you want me to check them.
6. **Domain:**
   - After the first deploy, open the Vercel project → Settings → Domains and add `glowup.openregent.ai`.
   - In Cloudflare DNS for openregent.ai, add exactly the record Vercel shows you, with Proxy status set to **DNS only** (grey cloud).
   - Wait until Vercel says the configuration is valid.

## After the freeze (optional, a nod to the talk)

7. Google Search Console: add the domain property, verify it with the TXT record in Cloudflare, and submit `https://glowup.openregent.ai/sitemap.xml`.

## Demo laptop

8. Charger plugged in, sleep disabled, notifications off.
9. Browser zoom checked on the projector at 1280×720.
10. Phone hotspot ready as a wifi backup.
11. Saved glow-ups open in a tab.
12. A backup video recorded (17:45–18:00).

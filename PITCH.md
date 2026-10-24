# Pitch: 3 minutes, live demo first

## Script

**0:00 Hook (20 s)**
"This morning we saw how a design team glows up a website by hand: audit the CSS, set target marks, derive design tokens, then apply one source of design everywhere. Glowup does that for any website in about two minutes."

**0:20 Problem (20 s)**
"Every street in Basel has businesses with websites from 2012. Agencies try to win them with cold emails and mood boards. Owners can't picture the result, so nothing happens."

**0:40 Live demo (90 s)**
1. "Name a local business." Paste its URL and press Glow it up.
2. While it runs, narrate the steps: "It's opening the real site in a cloud browser… now it's measuring: 47 colour literals, 4 font families, 6 radii. That's measured, not guessed."
3. Show the target marks: "Same chart as this morning. Now 80, target 25, toward Warm. The basis is what we measured."
4. The redesign streams in next to the original. Press Show mobile.
5. Open One source: "Same tokens: homepage, Instagram post and slide."
6. If the live site fails, say "Let's use one we ran earlier" and open a saved glow-up. Don't debug on stage.

**2:10 Why it isn't AI slop (20 s)**
"Three rules in code:
- Every colour must come from the tokens, and the code rejects anything else.
- Every word and photo comes from their own site.
- Every page is labelled as a concept, not their site."

**2:30 Business (20 s)**
"Agencies and freelancers pay per pitch. They send the owner a finished concept instead of a promise. Pitch with the result."

**2:50 Close (10 s)**
"glowup.openregent.ai. Try your favourite shop."

## Likely questions

- **"Lovable, Framer and Wix already generate websites."**
  They start from a blank prompt. We start from the business's existing brand, measure it, and show the before/after gap. It's a sales tool for agencies, not a site builder.
- **"Isn't this using their brand without permission?"**
  - Each page is a concept preview with a banner, noindex, and no public URL.
  - Images load from their own site.
  - It's meant to be shown to the owner, who decides.
- **"What if the AI invents things?"**
  - Content comes only from what we scraped.
  - The prompts forbid prices, reviews and awards that aren't on the site.
  - The colours and fonts are enforced in code.
- **"What if a site blocks you?"**
  Gaffa runs real browsers. If a site still fails, we say so and offer the saved glow-ups.
- **"How do you make money?"**
  Per-pitch credits or a monthly plan for agencies. An upsell is building the real site from the same tokens.
- **"What does a run cost?"**
  Only answer with numbers you measured today: Gaffa credits per run, plus LLM cost per run from the console.

## Rules on stage

- Don't claim market numbers you haven't checked.
- Keep the saved glow-ups one click away.
- Show the backup video if the wifi dies.

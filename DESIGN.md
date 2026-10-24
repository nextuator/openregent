# Glowup: design direction for the app's own UI

This file styles **the Glowup app only**. Never apply it to generated shop pages, posts or slides: those use the shop's generated tokens (see CLAUDE.md, non-negotiable 2).

## Idea: the editor's markup

Glowup is a design audit, so the UI borrows from an editor marking up a proof:
- The app is a calm proof sheet in Basel black and white, with Swiss red as the only accent (24 Oct). The Basel flag (black Baslerstab on white) and the Swiss cross appear as marks; never the cantonal coat of arms in shield form (Wappenschutzgesetz).
- **Highlighter yellow** marks measured facts: the evidence.
- **Red pen** marks what should change: targets, gaps, failed checks.
- The only thing that glows is the redesign.

The boldness goes in one place: the highlighter and red-pen marks. Everything around them stays quiet.

## Target marks for this UI

The scale and axes are the same as in the talk:

| Axis | Target | Meaning here |
|---|---|---|
| Warm ↔ Cool | 62 | cool neutral greys, no cream, no beige |
| Systematic ↔ Crafted | 55 | one type family used expressively, marker details drawn by hand in SVG |
| Flat ↔ Deep | 20 | 1px rules, no stacked shadows; only the redesign frame is lifted |
| Enthusiastic ↔ Rational | 65 | measured numbers and plain verbs, no superlatives |
| Formal ↔ Informal | 50 | direct and friendly, sentence case |
| Funny ↔ Serious | 60 | a wink is allowed in the empty state, never in results |
| Dense ↔ Airy | 60 | generous, but the audit tables can be dense |

## Colour

| Token | Hex | Use |
|---|---|---|
| paper | `#F4F4F2` | page background (neutral, near white) |
| sheet | `#FFFFFF` | panels, frames |
| ink | `#000000` | Basel black: text, Baslerstab, primary button fill |
| graphite | `#4D4D4D` | secondary text (7.7:1 on paper) |
| rule | `#D4D4D4` | 1px borders and dividers |
| highlight | `#FFD6D2` | red-pen marker behind measured values and the headline phrase (ink on it 15.8:1) |
| redline | `#D52B1E` | Swiss red: cross, target diamonds, gaps, failed checks (5.0:1 on white) |

Banned colours:
- Purple or violet gradients (the event's own look).
- Cream with terracotta.
- Gradients as decoration.

## Type

- **Display: Fraunces** (variable, opsz 144, SOFT 50, weight 600, letter-spacing -0.02em, line-height 0.98), with one italic highlighted phrase in the home headline.
- **UI and body: Inter**, weight 400/600, line-height 1.5.
- Both loaded with `next/font/google`.
- **Measurements:** `font-variant-numeric: tabular-nums`. No monospace.
- **Scale:** 14, 17 (body), 21, 27, 34, 54, 84 (home headline only).
- **Projector rule:** never go below 14 px, and body text is 17 px.

## Layout

- Everything is left-aligned. Max width 1280 px, 32 px side padding (16 px on mobile). Text measure ≤ 70ch.
- **Home:**
  ```
  Show any local business its better website.      ← display, 84px, 2 lines max
  [ https://…                         ] [Glow it up]
  Try a bakery, a bike shop or a dentist in Basel.  ← graphite, 17px

  Saved glow-ups
  [before|after thumb] [before|after thumb] [before|after thumb]
  ```
- **Run view:**
  ```
  bäckerei-xy.ch                                        Desktop | Mobile
  1 Opening the site … ✓   2 Measuring the CSS …  (horizontal stepper, collapses when done)

  Before and after | Target marks | Audit | Tokens | One source

  ┌ original screenshot ┐   ┌═ redesign (iframe) ══┐  ← highlighter outline + the only shadow
  │                     │   ║                      ║
  ```
- **Before and after:** two equal columns with a 24 px gutter. Each frame scrolls on its own. The redesign frame is the hero of the app.

## Signature elements

1. **Highlighter mark.**
   - Measured numbers sit on a hand-drawn highlighter swipe: an SVG shape behind the text with slightly ragged ends at about 85% opacity. A flat background-color box is not the same thing.
   - Use it for measured facts only.
2. **Red-pen marks.**
   - Failed health checks get a red hand-drawn underline, an SVG squiggle.
   - "Change" sentences in target marks get a red margin tick.
3. **Target marks view** (recreate the talk's visual so the jury recognises it). For each axis:
   - The left label sits at the left end and the right label at the right end.
   - A 1 px ink track runs between them.
   - Now: a hollow ink square, with its number above.
   - Target: a filled redline diamond, with its number below.
   - The segment between them is drawn in redline, 2 px.
   - Below the track:
     - A bold sentence like "Now 80, target 25. Gap 55, toward Warm."
     - The change sentence.
     - The basis in italic graphite.
4. **The glow:** when the redesign finishes, a 6 px highlighter outline draws once around the redesign frame (an SVG stroke animation, 700 ms). This is the only orchestrated motion in the app. With `prefers-reduced-motion`, show the outline without animating it.

## Components

- **Radius:** controls (inputs, buttons, tabs) use `--radius-control` (6 px). Preview frames use `--radius-frame` (10 px). Tables and data rows are square.
- **Shadow:** only the redesign frame uses `--shadow-lift`. Everything else is separated by 1 px rule borders or the paper and sheet contrast.
- **Buttons:**
  - Primary: ink fill, sheet text, 1.5 px ink border.
  - Secondary: sheet fill, ink border.
  - Labels name the action: "Glow it up", "Show mobile", "Show desktop", "Download post", "Download slide". No arrows or emoji.
- **Tabs:** text plus a 3 px ink underline on the active tab.
- **Focus:** a 3 px ink outline with 2 px offset, visible on every interactive element.

## Copy rules

- Sentence case everywhere. No all-caps labels, no eyebrow labels above headings, no "A · B · C" meta strings, no "→" in buttons.
- Use numbered markers only for the pipeline steps, which are a real sequence.
- Errors say what happened and what to do, e.g. "Couldn't open that site. Check the address or pick a saved glow-up below."
- Empty gallery: "Nothing glowed up yet. Paste a website above."
- The words used in the UI: "glow-up" (noun), "Glow it up" (button), "redesign", "target marks", "tokens". Use them consistently.

## Quality floor

- Responsive down to 390 px. On mobile, Before and after stacks: after first, then before.
- Keyboard focus is always visible, and `prefers-reduced-motion` is respected.
- Contrast is AA or better everywhere.
- Test at 1280×720 (projector) and 390×844.

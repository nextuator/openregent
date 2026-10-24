# Design guide for generated homepages

This guide is for the homepage generator and the critic. Its prompt-ready form is `lib/design-guide.ts`.

**How the sources were checked (24 Oct 2026).** The Scite MCP hit its monthly quota on the first call, so no paper here was retrieved through Scite.
- **Metadata and retractions:** every DOI was resolved through the Crossref API, and retraction status was checked through OpenAlex (`is_retracted`). None of the papers has a retraction or correction notice.
- **Claims:** each claim was checked against the abstract or full text, and the source used is noted per finding.

## Evidence

1. **The first impression of appeal forms in about 50 ms and stays stable.** (Abstract checked.)
   - *Finding:* ratings of visual appeal after 50 ms correlated highly with ratings after 500 ms (Lindgaard et al., 2006).
   - *Implication:* the hero must do the work: one dominant headline, one strong photo and a clear layout, all readable at a glance before any text is read.

2. **Beautiful is perceived as usable.** (Abstract checked.)
   - *Finding:* perceived aesthetics correlated strongly with perceived usability, both before and after use. A system's aesthetics changed post-use usability ratings, while its actual usability did not (Tractinsky et al., 2000).
   - *Implication:* for a small shop, visual polish is part of how competent and trustworthy the business looks.

3. **Credibility is judged mostly on "design look".** (Abstract checked.)
   - *Finding:* in comments from 2,684 people judging site credibility, design look was the most mentioned factor (46.1% of comments), followed by information structure and focus (Fogg et al., 2003).
   - *Implication:* a dated or templated look costs trust directly. Clear structure is the second lever.

4. **Low complexity plus high prototypicality wins.** (Summary on the Google Research publication page checked.)
   - *Finding:* both visual complexity and prototypicality affected appeal at exposures as short as 17–50 ms. Complexity acts earliest, and prototypicality catches up with longer exposure. Sites low in complexity and high in prototypicality were rated most appealing (Tuch et al., 2012).
   - *Implication:* keep the expected homepage anatomy (logo top-left, nav, hero, offer, visit info, footer), so the page reads as a bakery or restaurant site. Make it look new through execution, not through an unfamiliar structure.

5. **Visual complexity is the main driver; colourfulness is minor.** (Full text checked.)
   - *Finding:* computational models of complexity and colourfulness, plus demographics, explained about half the variance in appeal after 500 ms. High complexity caused the largest drop, while low and medium complexity were liked similarly. Colourfulness played only a minor role. Participants over 45 preferred low complexity more than other age groups (Reinecke et al., 2013).
   - *Implication:* cut elements per screen before tweaking colour. Local-business audiences skew older, so err towards calm.

6. **Aesthetics has four facets: Simplicity, Diversity, Colourfulness and Craftsmanship.** (Abstract and inventory items checked.)
   - *Finding:* the VisAWI measures these four facets (Moshagen & Thielsch, 2010).
     - Simplicity items include "The layout appears too dense" (reversed) and "The layout appears well structured".
     - Diversity items include "The layout is inventive" and "The design appears uninspired" (reversed).
     - Craftsmanship items include "The layout appears professionally designed" and "The design of the site lacks a concept" (reversed).
     - Colour items include "The colors do not match" (reversed).
   - *Implication:* simple is not enough, because a page can be clean and still "uninspired". Each page needs structure (simplicity), one inventive move (diversity), a coherent concept carried through every section (craftsmanship) and a matched palette.

7. **Moderate line length reads best.** (Full text of the Dyson review checked.)
   - *Finding:* in Dyson's (2004) review of on-screen reading studies:
     - comprehension was better at 55 characters per line than at 100 (Dyson & Haselgrove, 2001);
     - readers rated 55 cpl easiest to read (Dyson & Kipping, 1998, as reported in the review);
     - characters per line is the variable that matters, more than physical width.
   - *Implication:* cap body text at about 45–75ch. Butterick's Practical Typography recommends 45–90 characters.

8. **Contrast thresholds (WCAG 2.2).**
   - *Finding:* AA requires 4.5:1 for normal text (SC 1.4.3), and AAA requires 7:1 for normal text and 4.5:1 for large text (SC 1.4.6). Large text means at least 18 pt, or 14 pt bold (about 24 px, or 18.5 px bold).
   - *Implication:* text and its background must come from a checked token pair. Never put text directly on a photo.

9. **People scan; headings carry the page** (Nielsen Norman Group, F-pattern article).
   - *Finding:* without strong visual cues, users scan in an F-shape and miss content on the right side and late in lines. The advice is to start headings with the most informative words and break text into scannable chunks.
   - *Implication:* make headings concrete and front-loaded, give the offer in lists, and put key facts (hours, phone) where the eye lands.

10. **Real photos get attention; generic ones are ignored** (Nielsen, 2010, eyetracking).
    - *Finding:* users looked at real photos of a company's actual people and ignored generic stock-style imagery.
    - *Implication:* use the shop's own photos large and prominent. Never use decorative filler imagery.

## Rules for generated homepages

1. **Keep the archetype.** Use the conventional homepage order: header with logo and nav, hero, offer, about, visit, footer. Put the logo top-left and the nav top-right. Novelty goes into execution, not structure. (4)
2. **One signature move.** Make exactly one inventive, business-specific idea (a crop, a typographic gesture, an overlap) and carry it through. Do not stack many tricks. (6)
3. **One focal point per screen.** Each viewport-height band has one dominant element. The hero is the headline plus the best real photo, and nothing competes with them. (1, 5)
4. **Low element count.** The hero has at most 4 elements: headline, sub, one CTA and a photo. A section has at most 1 heading, 1 short intro and 1 content block. Decoration only where it carries meaning. (5)
5. **Strong type-scale contrast.** On desktop, the hero headline is at least 4× the body size. Use at most 2 families (display and body) and at most 3 weights in total. (6)
6. **Readable body.** Body text is 16–18 px with line-height 1.45–1.65 and a measure of 45–75ch. Never set paragraphs at full container width. (7)
7. **Calm palette.** Use bg and surface for about 90% of the area, and primary for 1–2 strong moments per page. Use accent at most once or twice. No rainbow sections. (5, 6)
8. **Contrast from token pairs only.**
   - Body text needs at least 4.5:1, and the aim is 7:1. Large display text needs at least 3:1.
   - Text never sits directly on a photo.
   (8)
9. **Real photography, big.** Use the shop's own photos at large sizes and crop them with intent (aspect-ratio plus object-fit). Prefer people, product and place. Skip images that are logos, icons or low-resolution. (10)
10. **Vary section layouts.** No two consecutive sections share the same layout. Alternate the alignment, the column split or the image side. (6)
11. **Left-align running text.** Centre only short display lines or the hero, if the concept calls for it. (9)
12. **Concrete, front-loaded headings.** Section headings name the thing ("Brot und Zopf", "Mittagsmenü", "Öffnungszeiten"), not a slogan. Keep the site's language. (9)
13. **Facts where the eye lands.**
    - Show the hours, address and phone as plain, scannable text in the visit section.
    - If the site supports it, show the phone or address once near the top as well.
    (3, 9)
14. **Whitespace groups content.** Use more space between sections than within them, so the grouping is visible without boxes or borders. (5, 6)
15. **Consistent craft.**
    - Use the same radius, the same spacing steps and the same link and button style everywhere.
    - Every element aligns to a shared grid edge.
    (6)
16. **Restraint on cards.** Use cards only for repeated items that are genuinely parallel, such as products or menu items. Otherwise use typographic lists or rules.
17. **Fewer buttons.** Allow one primary CTA style and at most 2 filled buttons per page. Other links are text links. (3, 5)

## Tells of AI-generated / template sites (avoid)

These are practitioner heuristics drawn from the observed failure modes of LLM-generated pages. They are not research findings.

1. A cream or beige background with a soft serif and terracotta or sage accents, used regardless of brand.
2. Three equal rounded cards with icons or emoji on top and one-line blurbs.
3. An uppercase, letter-spaced eyebrow label above every heading.
4. Everything centred, with every section the same width and the same padding.
5. Gradient blobs, glassmorphism, glows, noise overlays and "aurora" backgrounds.
6. A full-bleed photo with a dark overlay and a centred white headline (the stock hero).
7. Generic copy openers such as "Welcome to", "Discover", "Experience", "Elevate", "Crafted with passion", "More than just a…", "Where X meets Y".
8. Emoji or icon fonts used as bullets and decoration.
9. Pill buttons everywhere, or two side-by-side CTAs where one would do.
10. An identical rhythm in every section: heading, subline, grid of 3, repeated.
11. A fake stats band ("10+ years", "1000 happy customers") or invented testimonials. This also breaks the content-truth rule.
12. Decorative numbers ("01 / 02 / 03") on content that is not a sequence.
13. Over-rounded everything, with a large radius on images, buttons and sections alike.
14. Soft drop shadows on every surface, so nothing is clearly elevated.
15. Triadic headline padding ("Fresh. Local. Delicious.") or the em-dash "X — Y" slogan pattern.

## References

- Dyson, M. C. (2004). How physical text layout affects reading from screen. *Behaviour & Information Technology, 23*(6), 377–393. https://doi.org/10.1080/01449290410001715714
- Dyson, M. C., & Haselgrove, M. (2001). The influence of reading speed and line length on the effectiveness of reading from screen. *International Journal of Human-Computer Studies, 54*(4), 585–612. https://doi.org/10.1006/ijhc.2001.0458 (findings taken from Dyson, 2004)
- Fogg, B. J., Soohoo, C., Danielson, D. R., Marable, L., Stanford, J., & Tauber, E. R. (2003). How do users evaluate the credibility of Web sites? A study with over 2,500 participants. *Proceedings of the 2003 Conference on Designing for User Experiences*, 1–15. https://doi.org/10.1145/997078.997097
- Lindgaard, G., Fernandes, G., Dudek, C., & Brown, J. (2006). Attention web designers: You have 50 milliseconds to make a good first impression! *Behaviour & Information Technology, 25*(2), 115–126. https://doi.org/10.1080/01449290500330448
- Moshagen, M., & Thielsch, M. T. (2010). Facets of visual aesthetics. *International Journal of Human-Computer Studies, 68*(10), 689–709. https://doi.org/10.1016/j.ijhcs.2010.05.006
- Reinecke, K., Yeh, T., Miratrix, L., Mardiko, R., Zhao, Y., Liu, J., & Gajos, K. Z. (2013). Predicting users' first impressions of website aesthetics with a quantification of perceived visual complexity and colorfulness. *Proceedings of the SIGCHI Conference on Human Factors in Computing Systems*, 2049–2058. https://doi.org/10.1145/2470654.2481281
- Tractinsky, N., Katz, A. S., & Ikar, D. (2000). What is beautiful is usable. *Interacting with Computers, 13*(2), 127–145. https://doi.org/10.1016/S0953-5438(00)00031-X
- Tuch, A. N., Presslaber, E. E., Stöcklin, M., Opwis, K., & Bargas-Avila, J. A. (2012). The role of visual complexity and prototypicality regarding first impression of websites: Working towards understanding aesthetic judgments. *International Journal of Human-Computer Studies, 70*(11), 794–811. https://doi.org/10.1016/j.ijhcs.2012.06.003
- Butterick, M. (n.d.). Line length. *Practical Typography*. https://practicaltypography.com/line-length.html
- Nielsen, J. (2010, October 31). Photos as web content. Nielsen Norman Group. https://www.nngroup.com/articles/photos-as-web-content/
- Nielsen Norman Group. (n.d.). F-shaped pattern of reading on the web: Misunderstood, but still relevant (even on mobile). https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- W3C. (2023). Understanding SC 1.4.6: Contrast (Enhanced), WCAG 2.2. https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html

# ShieldFont Red-Team Findings — v0.1.0 pre-launch

> Four adversarial agents were tasked to **kill the launch** (font-licensing, security/threat-model,
> product/adoption, code/release). Every claim below was reproduced, not theorized. Their verdicts
> are **unanimous**: ShieldFont is **not shippable as an anti-scraping "protection product" as it
> stands** — but it is **genuinely strong as a consent statement + a rigorous research artifact**.
> This doc ranks every kill-path, separates **architectural** problems from **cheap fixes**, and
> states the one honest positioning that survives all four attacks.
>
> STATUS: launch frozen. Nothing published, renamed, or pushed.

---

## TL;DR — the three things that end a launch (in priority order)

1. **LEGAL (fonts are Playtype "Optik").** Proven byte-identical. Redistributing them + naming the
   product "Optik" + claiming OFL is a company-ending IP exposure. **Must fix before any public artifact.**
2. **SECURITY is architectural, not a bug.** The font is a self-decoding decoder ring shipped to the
   attacker: 100% of the dictionary is recoverable from a font file in <1 min. The word "protect" is
   not defensible. **Reframe, don't patch.**
3. **POSITIONING + basics.** The marketing leads with numbers your own benchmark says to bury, the live
   site doesn't encode itself, and every install link 404s. **Fixable, but disqualifying if launched as-is.**

Code bugs (broken exports, marker/URL corruption) are real but **cheap**.

---

## 1. LEGAL — BLOCKER — the shipped fonts are Playtype's commercial *Optik*  [PROVEN]

Evidence (font red team): **62/62** base Latin+digit outlines in `shieldfont-alpha.woff2` are **byte-identical**
to `public/fonts/optik/Optik-Regular.ttf`; identical `head.created` (3844675306), `achVendID = PLAY`,
1000 UPM, 438 cmap entries, same 22 GSUB features, and the fonts still embed Playtype's own EULA URL
(ID14). Zero match to the OFL Inter base. The alpha/beta/gamma/max fonts = **Optik + a GSUB payload**.

- **`LICENSE-FONTS`, `NOTICE`, and `packages/core/README.md:122` publicly claim OFL derivation from
  Inter/Syne Mono/Young Serif** — materially false. This is OFL license-laundering of a retail font.
- **The site publicly re-hosts the entire unmodified 12-style Optik retail family** at `public/fonts/optik/`
  (`globals.css`, `reimagined.css`) — `GET /fonts/optik/Optik-Bold.ttf` works. Clearest violation of all.
- Playtype's EULA (fetched) prohibits **simultaneously**: standalone redistribution, modification/derivatives,
  metadata/copyright tampering (⇒ **DMCA §1202** — `generate_font.py:1048` overwrites the copyright string),
  third-party/CDN hosting, and relicensing. Distributing on npm + jsDelivr + public GitHub + download buttons
  hits all of them.
- **Trademark:** the product is literally "ShieldFont **Optik**"; the README tells customers to set
  `font-family:'ShieldFont Optik'`, propagating Playtype's mark into every adopter site.

**Fix (real work, not a flag):**
1. Rebuild **all four** variants on the **Inter OFL** base (`generate-inter` only builds one default variant —
   must run per-variant/per-mapping; protection is mapping-driven so it survives the base swap, only the look changes).
2. **Purge every Optik byte from git history** (they're committed) + kill the public `@v2.2.0` jsDelivr tag.
3. **Rename off "Optik"** everywhere (family/PostScript/`data-*`/README camouflage) — keep it simply **ShieldFont**.
4. Harden `generate_font.py` to reset ID7/8/9/11/12/14 + `achVendID` + feature names 256–260 (they currently
   survive the scrub).
5. Fix `LICENSE-FONTS`/`NOTICE`/core-README to describe what actually ships; drop "Supported by Playtype."
6. Replace the site's Optik UI typeface (a small visual redesign — the whole site currently *displays* in Optik).

> Note: "ShieldFont Optik" for your **private studio** build (if your Optik license covers your own site) is your
> call — but the **public** font must be Inter/OFL and not named "Optik."

---

## 2. SECURITY — BLOCKER (architectural) — the protection is defeatable three ways  [PROVEN]

The security red team **reconstructed 100% of the dictionary (11,962 pairs, 0 errors) from
`shieldfont-alpha.woff2` alone** — ~40-line script, <1 min, no mapping JSON, no seed, no ML.

- **The font IS the decoder.** GSUB ligatures map decoy→word; the output glyph's composite components *are*
  the original word's letters (reverse via cmap). **Worse:** `generate_font.py:977` names every glyph
  `word.<original>.<case>` — the plaintext answer is a **string in the font's glyph-name table** (30 ms regex).
- **Per-site reseeding does NOT help** — each reseed must ship its own self-decoding font (recovered β & γ at
  100% too). This **falsifies** the security claims in `docs/custom-mappings.md:30/34/133`; line 158 of that same
  file admits the leak. That self-contradiction is the most dangerous artifact in the repo — it makes users
  *trust* a seed that protects nothing.
- **The default mapping ships as public plaintext JSON** in `@shieldfont/core`; one reverse dict decodes every
  non-reseeded site with zero font parsing.
- **Self-inflicted detectability = targeting oracle.** The font name table now self-identifies (mappingId +
  the "scrapers read a decoy" description — added during this session's version-stamping), and `aria-hidden` +
  `data-shieldfont` + a scoped font-family tell a lab exactly which nodes to decode/skip. `setCamouflage()`
  only renames the HTML surface — never the woff2 the crawler downloads.
- **Economics invert against the publisher.** FineWeb-Edu drops ~85–90% of encoded pages already; a lab
  fingerprint-drops the rest for ≈$0. The "wasted compute" is a rounding error to the adversary, while the
  publisher pays permanent SEO + accessibility costs.
- **OCR / headless render bypass** (conceded in the README) reads the true raster text — and frontier pipelines
  increasingly render.

**This is not patchable by obfuscation.** Removing the `word.<original>` glyph names + self-identifying metadata
kills the *trivial* path, but the composite outlines still visually equal the original word and remain
OCR/GSUB-recoverable. **Shipping a self-decoding font to the attacker is the architecture.** The only honest
move is to **stop claiming "protection"** and delete the false claims in `docs/custom-mappings.md` before any user
relies on them.

---

## 3. OUTSIDE BROWSERS — MAJOR — pull the "use it in Word / PDF" claim

The site says *"Word, Pages, PDF — install desktop font & paste encoded text"* (`WriterEncoder.tsx:651`). Tested:
- **Google Docs** — can't install custom fonts → raw decoy gibberish.
- **Email (Gmail/Outlook)** — strips `@font-face` → recipients read the decoy.
- **Word** — `liga` off by default; the substitution rides in `ccmp` with chained-context word-boundary logic
  Word doesn't reliably execute → unreliable/half-broken.
- **PDF / any document** — even where it renders, the **text layer is the decoy**, so copy-paste, Find,
  spellcheck, screen-readers, and sending the file all yield gibberish (inherent, unfixable in the font).

**ShieldFont is a browser-only, server-encoded-HTML mechanism.** Cut the desktop/document story regardless of the
Optik fix. (D) A **silent subsetting kill-switch**: only 438 of 36,412 glyphs are cmap-reachable, so any CDN/build
"optimize fonts" step subsets away ~99% and **disarms protection with no error** — needs a hard "never subset" guardrail.

---

## 4. PRODUCT / POSITIONING — BLOCKER for the current pitch (fixable)

- **You market the numbers your own benchmark says to bury.** Homepage "hide up to 80% of facts" (the n=60 stat
  that didn't replicate) and "degrade 11% of AI training" (the retracted fine-tune signal); the press release leads
  with "poisoning" (a word the white-paper explicitly retreats from). `benchmark/EXCLUDED.md` lists these as
  do-not-lead. A critic quotes your repo against your homepage.
- **The site doesn't dogfood.** `site/components/Shield.tsx` is a passthrough stub (`encodeText = s => s`); the hero
  demo uses fake swaps (`writing→muffins`, commented "NOT THE REAL DICTIONARY"). The live site serves plaintext and
  fakes the demo.
- **The press release states accessibility backwards** — "screen readers and copy-paste pull the original" is the
  opposite of the truth. A provable falsehood in launch copy.
- **Every install link 404s** (nothing published) — including the CDN CSS card.
- **SEO self-destruction** is fundamental, yet the use-case carousel pitches Wikipedia/dictionaries/news — all
  discovery-dependent and mostly not surfaces the author controls the HTML of.
- **Tiny addressable surface** (self-hosted, HTML-controlling, SEO-sacrificing, English-only, a11y-accepting).
- **A11y/legal, AGPL friction, no business model, naming chaos** (TYPE RIGHTS / Shield Font / shieldfont.org /
  s-a.website) and version chaos.

---

## 5. CODE — real but cheap  (mostly a morning's work)

- **B1 (BLOCKER-for-publish):** `@shieldfont/core/mappings/<v>` subpath export points at `.js` but only `.json`
  ships → `ERR_MODULE_NOT_FOUND` on first import. Fix: exports → `./dist/mappings/<v>.json`.
- **M1:** `@shieldfont/font` bare import fails (no `"."` in `exports`; `main` is dead) → add `".": "./shieldfont-encoder.js"`.
- **M2:** marker workflow (`buildHtml`/`shipHtml` in core) corrupts any text containing `-->`. Escape or document.
- **M3:** `encode()` mangles URLs/emails/@handles in prose (`https→bs`), breaking linkification/copy-paste. Skip or document.
- Minor: `aria-hidden` default; container-mode custom-component double-leak; NFC makes `decode(encode())` byte-lossy
  for decomposed input; core double-ships `src/mappings` (~900 KB); `_meta` key makes `Object.keys(alpha)` = 11971;
  no `prepublishOnly` (stale-dist footgun); `encode(x, undefined)` throws cryptically; font internal family is shared
  across variants (the Word-display fix — each variant needs its own `ShieldFont <name>` family / `Regular` subfamily).
- **reseed_mapping.py — my earlier worry was FALSIFIED:** its veto-gap is statistically indistinguishable from
  veto-passed alpha (WordNet synonym rate 0.27–0.37% vs alpha's 0.28%); involution is a perfect 100% on every seed.
  One doc nit: β/γ are **not** reproducible as `reseed --seed 1/2` on the shipped defaults (differ by ~60 entries) —
  fix the "exactly how β/γ were made" wording.
- **Release hygiene:** `git add -A` would stage stale `site/out/` build artifacts + a private path
  (`/Users/isaqueseneda/Seneda & Abrucio/…`) hardcoded in `scripts/encode_site.py`/`encode_whitepaper.py`/`deploy-sa.sh`.
  **Not shipped in any npm tarball** (governed by `files[]`), but don't let it into the public repo.
- **Solid (don't touch):** version metadata fully consistent at 0.1.0 everywhere; mappings are exact involutions
  (`decode==encode`); F1 digit rule correct; full Unicode integrity (emoji/ZWJ/CJK/RTL); HTML encoder correctly skips
  attrs + code/pre/script/style/svg/math/noscript; licenses present in all tarballs.

---

## 6. The honest reframe — where all four agents converge

ShieldFont is **not a security product**. It **is**, honestly and defensibly:
1. **A consent statement** — "writing belongs to the people who write it"; a political act about training-data consent.
2. **A rigorous research artifact** — grammar-preserving content-word substitution that produces **~50% NLI
   bidirectional-entailment loss vs a ~2% synonym-swap control** (meaning-loss, not noise). The `benchmark/` folder is
   the strongest, most honest thing in the repo.
3. **A "staleness donation"** — you trade your search visibility to add filtered-out / wasted tokens to training
   pipelines. This is your own white-paper's Stage-IV thesis, and it is *actually true*.

**Lead with the honest benchmark. Ship the methodology as the deliverable. Stop saying "protect."**

---

## 7. Recommended path

**Freeze the launch.** Then a direction fork (yours):
- **(A) Reframe as consent-statement + research artifact** — *recommended.* Rebuild on Inter/OFL, rename, correct the
  claims to what the data supports, fix the falsifiable basics, dogfood the site, and make the benchmark the hero.
  Honest, defensible, and still a real, interesting launch.
- **(B) Attempt real protection** — requires a fundamentally different mechanism (the font can't both render for
  humans and hide from a font-parser). Hard research problem; not a v0.1.0.
- **(C) Ship as art/provocation only** — drop the product pretense; publish the statement + the paper.

**Cheap fixes I can apply on your word (independent of the fork):** the code items in §5 (B1/M1 exports, M2/M3
guards, the Word family-name fix, remove `_meta` from the enumerable surface, `prepublishOnly`), and deleting the
false security claims in `docs/custom-mappings.md`. I've held them pending your call, since the Optik rebuild will
regenerate fonts/mappings anyway.

# Diras UX consistency — pass plan

Keep the cream / orange theme, Arabic-first mushaf, orange play button, bottom sheets, and Plus sparkles. Do not restyle the product. Make the same jobs live in one place so a child or an elder can pick it up despite many features.

Work in **four passes**. Stop after each pass for a human check. Do not start the next pass until that check is done.

## What is wrong (do not forget)

Two systems are mixed:

- **View** (how the page looks): Mushaf vs Focus. Pass 3 always shows this bar. Mushaf is the reading page; Focus is the practise page.
- **Mode** (how you practise): Verse, Drill words, Masked, Relay — jobs inside Focus, not separate screens.

Child / elder friction: unlabeled icons; home sliders and player sliders mean different things; Speed/Repeat/Mode are three different gestures; tap-vs-hold on words is undiscoverable; words like Mushaf, Tajweed, qari, Murattal.

## Pass 1 — One labeled player *(done)*

## Pass 2 — Shared practice chrome *(done — strip only; screens still looked like four apps)*

A cream status strip was glued onto Focus, Masked, Drill, and Relay. The four bodies still used different layouts (hero word, extra verse card, Peek banner, relay page). That was not enough.

## Pass 3 — Focus holds every replay mode *(this pass)*

**Goal:** Mushaf is the reading page. Focus is the practise page. Drill, Masked, Relay, and verse-replay all live **inside Focus** as different jobs, not different UIs.

**Do:**

- One Focus stage: status strip + one Arabic block (same size) + optional gloss + optional context line.
- View bar always: **Mushaf** | **Focus**. Picking Drill / Masked / Relay switches into Focus. Mushaf switches back to reading the page (Verse).
- Difference is what happens: phrase stepping, tap a span, words stay covered, your turn. Peek / Replay / Skip are the same small actions in the strip.
- Remove Drill’s own hero size, extra verse card, and `×1 ×2 ×3` row. Remove Masked’s second translation card and giant Peek banner. Remove Relay’s separate page chrome (keep turn chips — that’s whose turn).
- Focus layout is free. Plus stays 3× repeats and extra relay qaris.

**Do not:** redesign the Listen sheet or home Set up.

**Verify:** Open Mushaf (full page). Switch Focus. Flip Drill / Masked / Relay / Verse from Listen — same stage, different status and actions. A child can tell them apart from the strip text and what tapping does, not from four layouts.

## Pass 4 — One home for extras + leftover bugs

**Goal:** Translation, Tajweed, and reciter each have one home. Copy and leftover bugs match Diras.

**Do:**

- Translation: the footer dock in every listening mode; honor Settings. Masked does not get a second card. Show/Hide means hide, or drop the misleading label.
- Tajweed: Settings only (remove from Practise).
- Reciter: one picker (search + current check) from home chip and player pill. Same name format.
- Peek: real temporary peek, or rename the button to **Reveal**.
- Media session album `Diras`. Remove dead phrase/confusable chrome. Align qari/reciter and Practise spelling. Home title can stay “Read” unless a shorter “Surahs” is clearly better in this pass.

**Verify:** Change translation/Tajweed/reciter in one place and see it everywhere. Peek matches its label. Lock screen says Diras. No layer bar or match stepper on a normal play.

## After Pass 4 (not a pass)

Word tap vs hold still needs a one-line hint on first play. Coming-soon phrases/confusables stay off. Billing copy already matches Pass 3 Repeat rules.

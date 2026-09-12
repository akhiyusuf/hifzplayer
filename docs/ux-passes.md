# Diras UX consistency — pass plan

Keep the cream / orange theme, Arabic-first mushaf, orange play button, bottom sheets, and Plus sparkles. Do not restyle the product. Make the same jobs live in one place so a child or an elder can pick it up despite many features.

Work in **four passes**. Stop after each pass for a human check. Do not start the next pass until that check is done.

## What is wrong (do not forget)

Two systems are mixed:

- **View** (how the page looks): Mushaf vs Focus. The View bar only shows in Verse mode.
- **Mode** (how you practise): Verse, Drill words, Masked, Relay.

Focus behaves like Masked and Drill (one chunk, a counter, footer steps that chunk) but sits in View. Masked / Drill / Relay each invent their own body chrome. Repeat, translation, Tajweed, reciter, and mode picking are copied in several places.

Child / elder friction: unlabeled icons; home sliders and player sliders mean different things; Speed/Repeat/Mode are three different gestures; tap-vs-hold on words is undiscoverable; words like Mushaf, Tajweed, qari, Murattal.

## Pass 1 — One labeled player *(this pass)*

**Goal:** The audio controls look like one player a child can name. Home “set up practise” is a different, labeled action.

**Do:**

- Player: replace the icon-only sliders control with a labeled **Listen** pill. The player itself stays seek + Listen + play.
- Tap Listen to open a **bottom sheet popup** (same sheet pattern as Reciter / Practise). Speed, Repeat, and How to listen live in that popup, not in the footer.
- Speed is four labeled chips (`¾× 1× 1.25× 1.5×`). Repeat is still On/Off until Pass 3. Tapping a mode applies it and closes the popup (Relay still opens relay setup).
- Home: the row action is **Set up** with the settings icon — not the same sliders glyph as Listen.

**Do not:** change Focus / Masked / Drill / Relay bodies, Repeat counts, Peek, translation dock rules, or copy like “Read”.

**Files:** `components/player.jsx` (footer + `setRate`), `app/page.tsx` (surah row), `app/globals.css` (append only).

**Verify:**

1. Home: each surah has Play on the row and **Set up** on the right. Set up still opens Practise.
2. Player: a **Listen** pill sits above Play. Tap it — a **Listen** sheet pops up over the page. Seek and play stay in the footer underneath.
3. In the sheet: Speed chips change the rate without closing. Repeat toggles. A mode card applies and closes the sheet.
4. Drill still hides seek/speed/repeat in the sheet and keeps How to listen. Theme (cream, orange play) unchanged.

## Pass 2 — Shared practice chrome

**Goal:** Focus, Masked, Drill, and Relay look like one family. Same header, same padding, one status strip.

**Do:**

- One status strip in the same place: `Phrase 2 of 5` / `Revealed 1 of 4` / `Word 1 of 4` / `Round 1 · your turn`.
- Mode canvas only below that strip (phrase, blurred line, hero word, or turn chips).
- Strip Drill’s extra range-bar chrome into that strip (keep hero word + verse picker in the canvas).
- Peek, Replay qari, and Skip my turn stay as extra actions in the shared strip / canvas, not a second toolbar.
- View bar can stay Mushaf/Focus for this pass.

**Do not:** move Focus into the mode list yet; do not unify Repeat counts yet.

**Verify:** Open Verse (Mushaf), Focus (or Plus gate), Drill, Masked, Relay. Counters and extra actions sit in the same band. Footer player from Pass 1 is unchanged.

## Pass 3 — One Repeat, Focus with its cousins

**Goal:** Repeat means the same thing everywhere. Focus sits with Masked / Drill / Relay, not as a “View”.

**Do:**

- One count list (`×1 ×2 ×3 ×5 ×10 ∞`). 1× and 2× free; 3+ and ∞ are Plus — including verse repeat (no more infinite-only Verse Repeat).
- Remove Drill’s `×1 ×2 ×3 ∞` seg and stop teaching Repeat in the word popover as a second home.
- Listening mode includes Focus (phrase-at-a-time). Mushaf stays the reading page. Drop the View bar or keep Mushaf-only.
- Footer prev/next still step phrase / word / verse from one pair of buttons.

**Verify:** Repeat chips in Listen match Plus rules. Drill has no second Repeat control. Focus is chosen next to Masked, not beside Mushaf. Mushaf still shows the full page.

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

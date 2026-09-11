# Product Quality Engineering Plan — Apple-grade Table Companion

Status: **engineering plan, proposed.** Recorded 2026-09-12 against commit `4277543`.
Scope authority: the [Minimal Table Companion Specification](minimal_table_companion_specification.md). This plan adds **no features** to that scope. It is the engineering programme that turns the agreed pillars into a product people love holding — Apple HIG behaviour, sub-100 ms response, and 60/120 fps motion — on the codebase that exists today.

Where this plan and a feature plan disagree about *what* to build, the Minimal Specification wins. Where they disagree about *how well* it must behave, this plan wins.

---

## 1. The product promise, stated as engineering

Six people sit at a table with dice in their hands. The companion is the thing they glance at between rolls. Every glance must be answered instantly, and every tap must feel like it happened before the finger lifted. That yields four non-negotiable properties:

| Property | What the player experiences | What it means in code |
| :--- | :--- | :--- |
| **Instant** | A tap's visual result is already there | Local echo on intent; server confirmation is invisible when it agrees |
| **Buttery** | Pan, zoom, scroll, and spotlight never stutter | Compositor-only animation; no layout work on the interaction path |
| **Familiar** | It behaves like a native Apple app | HIG controls, targets, materials, motion curves, focus and keyboard |
| **Trustworthy** | The screen is never wrong, never spoils, never forgets | Server-authoritative fog; resumable sessions; no silent fallbacks |

---

## 2. Measured baseline (2026-09-12)

Numbers below were taken from this repository, not estimated.

| Measurement | Value | Method |
| :--- | :--- | :--- |
| Test suite | 219 tests / 33 files, all passing, 2.93 s | `npm test` |
| Client bundle | 474.77 kB raw / 140.10 kB gzip, **one chunk** | `npm run build` |
| Stylesheet | 42.17 kB / 9.40 kB gzip, 2 544 lines | `npm run build` |
| `getState` — fresh campaign | 8.66 kB JSON, 0.62 ms | in-memory `AshDatabase` probe |
| `getState` — realistic mid-session | **62.8 kB JSON**, 0.84 ms | 12 characters, 19 revealed hexes, 15 rooms, 60 rolls, 100 notes, 1 encounter |
| Largest snapshot sections | `notes` 20.5 kB, `characters` 14.7 kB, `rolls` 10.2 kB, `hexes` 6.8 kB, `rooms` 4.5 kB | same probe |
| Client root component | `src/client/App.tsx`, **6 724 lines**, single `useState<CampaignState>` | source |
| Server route module | `src/server/app.ts`, 4 675 lines | source |

### What those numbers mean

`broadcast()` in `src/server/app.ts:467` rebuilds the **whole** projection **per connected socket** on **every** mutation. At a full table (host + 6 phones = 7 sockets) one HP tick costs ~6 ms of server CPU and pushes **~440 kB across the LAN** — to communicate a single integer. Each client then parses 62.8 kB and re-renders a 6 724-line tree from the root, because `next.on("state", setState)` replaces the single root state object.

`notes` + `rolls` + `characters` are **73 % of the payload** and are almost never what changed.

This is the single largest obstacle to the product promise, and it is fixable without changing any rule, any fog guarantee, or any screen.

---

## 3. Budgets (the definition of done)

Every budget is enforced by a test that fails the build, not by reviewer judgement.

### Latency (host computer + phones on the same LAN)

| Interaction | Budget | Notes |
| :--- | :--- | :--- |
| Tap → visible local response | **≤ 16 ms** | Local echo; no network in the path |
| Tap → server-confirmed state on the acting device | ≤ 100 ms p95 | Commit, persist, project, deliver |
| Tap → other devices updated | ≤ 150 ms p95 | Observers at the same table |
| Tab switch | ≤ 50 ms to first paint of the new surface | Prefetched, code-split |
| Cold load on a mid-range phone | ≤ 1.5 s to interactive | Over LAN HTTP |
| Reconnect → correct state | ≤ 1 s after the socket reopens | Resume, not reload |

### Frame and payload

| Budget | Value |
| :--- | :--- |
| Frame budget during pan / zoom / scroll | 8 ms (120 Hz-safe); **zero** long tasks > 50 ms |
| Steady-state idle main-thread work | 0 — no infinite animations running when nothing is happening |
| Per-mutation broadcast payload | ≤ 4 kB p95, ≤ 16 kB p99 |
| Initial snapshot | ≤ 32 kB gzip |
| Route chunk (any single tab) | ≤ 60 kB gzip |
| Initial JS (shell + first tab) | ≤ 90 kB gzip |

---

## 4. Workstreams

### A. Transport: deltas, slices, and one projection per role

**Problem.** One opaque snapshot, rebuilt per socket, broadcast in full.

**Design.**

1. **Slice the projection.** Split `CampaignState` into independently versioned slices along the lines the UI already uses: `campaign`, `characters`, `hexes`, `rooms`, `encounters`, `combat`, `rewards`, `rolls`, `notes`, `tablePlayers`, `zones`. Each carries its own `revision`.
2. **Version per slice, not per campaign.** A mutation declares the slices it touched. `broadcast` sends only `{ campaignRevision, slices: { characters: {...} } }`. The client replaces those slice objects and leaves the rest referentially identical — which is what lets React skip the subtrees.
3. **Project once per role, not once per socket.** Visibility depends on `(role, characterId)`, and at a table there are at most a handful of distinct combinations. Build a per-role projection once per broadcast and fan it out. Memoise on `(campaignRevision, role, characterId)` and invalidate on revision change.
4. **Paginate the append-only surfaces.** `rolls` and `notes` — 49 % of the payload — become cursor-paginated reads with live append events (`roll:appended`, `note:appended`) carrying one record. The Chronicle tab fetches pages on demand.
5. **Static content leaves the wire entirely.** `availableZones` and `activeZone` (3.8 kB on every broadcast) are build-time constants already present in `src/shared/zone-profiles.ts`. The client imports them; the server sends only the active zone **id**.

**Expected effect:** the routine case (HP tick, torch burn, turn advance) drops from 62.8 kB × 7 sockets to under 1 kB × 7, and from seven projections to one.

**Non-negotiable:** slicing must not widen visibility. Fog filtering stays inside each slice's projector, and the existing fog tests must pass unmodified. Add a test asserting that the union of all slices in a player projection is identical in visible content to today's filtered snapshot for the same state.

### B. Client architecture: decompose the monolith, subscribe narrowly

**Problem.** 6 724 lines in one file, one root `useState`, every tab's state hoisted into the same component, and derived map geometry recomputed on every render.

**Design.**

1. **External store, selector subscriptions.** Move campaign state out of React into a small store (`useSyncExternalStore` over the slice map — no new dependency needed). Components subscribe to the slices and fields they read. An HP change re-renders the one stat row, not the table.
2. **Split by surface, one file per tab.** `src/client/surfaces/{map,site,combat,party,sanctuary,encounters,oracle,chronicle}/`. Each tab becomes a lazily-imported route chunk, prefetched on idle so a switch costs no network. Shared primitives go to `src/client/ui/` (Button, Sheet, Field, List, Stepper, Badge, StatTile).
3. **Memoise geometry.** `FrontierMap` recomputes `hexCenter` for every hex plus `Math.min`/`Math.max` spreads plus `mapConnections` on every render. Hoist to `useMemo` keyed on the hexes slice revision. Site graphs get the same treatment.
4. **Keep the interaction path out of React.** `MapViewport`'s pointer panning already writes `scrollLeft` directly and is correct — preserve that pattern. Zoom currently goes through React state; move the visual transform to a CSS custom property written imperatively during the gesture and commit the final value to state on gesture end.
5. **No silent fallbacks.** Per project convention, a missing or malformed slice throws and surfaces a visible recovery affordance. `getSession`'s `catch { return null }` becomes an explicit "this device's session is unreadable — rejoin" state, not a silent downgrade to the join screen.

**Sequencing rule:** decomposition happens *file by file behind unchanged behaviour*, each step green on the existing 219 tests. No "big rewrite" branch.

### C. Optimistic intent: the 16 ms tap

**Problem.** Today a tap waits for commit → persist → project → broadcast before anything changes on screen. Even at 20 ms that reads as mechanical rather than alive.

**Design.**

1. **Local echo for the safe, reversible, numeric mutations only** — HP deltas, condition toggles, light ticks, turn advance, coin and slot edits, note drafts. These are the high-frequency taps.
2. **Never echo a reveal.** Anything that could disclose hidden information — fog reveal, lore unlock, trap discovery, monster AC, treasure, reaction results, path clues — renders *only* from server state. Guessing a secret locally and correcting it afterwards would leak it. This is an absolute line, enforced by an allowlist of echoable intents in `src/shared/mutations.ts` and a test that every receipted action is either on the allowlist or explicitly marked server-only.
3. **Reconcile, don't blink.** An echoed intent is held until its `actionId` appears in a confirmed slice revision. On agreement the echo simply retires with no repaint. On disagreement the server value wins with a brief, deliberate correction transition and a Chronicle entry.
4. **Fix the transport hole first.** `sendMutation` uses `socket.volatile.emit` (`src/client/mutations.ts`), which permits the packet to be dropped when the socket is not writable. For receipted, revision-guarded mutations that is the wrong channel. Use a reliable emit with the existing `actionId` idempotency as the duplicate guard, and keep the single bounded retry.

### D. Design system: Apple HIG as contract, flame and ash as skin

**The tension, resolved.** Apple's HIG is not a palette — it is a specification for *behaviour, structure, metrics, materials, and motion*. This plan adopts HIG for all of those. The skin is **"flame and ash"**: a light, warm-white product throughout, with blue-ash grey carrying structure and tone, and ember orange used *sparsely* — only where it means something. The app should feel like a well-made Mac app with a campaign's warmth in it, not a dark grimoire simulator.

This replaces the app's current hard-coded dark grimoire theme. Light is the default and the identity; dark is a faithful secondary inversion for evening play, not a separate design.

**1. Tokens.** Replace the 237 ad-hoc custom properties with a single layered token file, `src/client/ui/tokens.css`:

* **Type.** System stack — `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable", system-ui` — for *all* UI chrome, controls, labels, and numerals. The serif (`Newsreader`) is reserved for in-world prose: room descriptions, rumours, lore. The monospace stack currently applied to `:root` is removed from chrome; it survives only for dice notation and target numbers, where tabular alignment earns it. Use `font-variant-numeric: tabular-nums` on every changing number so HP and timers do not jitter.
* **Scale.** HIG-derived ramp: Large Title 34 / Title1 28 / Title2 22 / Title3 20 / Headline 17 semibold / Body 17 / Callout 16 / Subhead 15 / Footnote 13 / Caption 12, with matching line heights. Today's 12–13 px chrome text is below HIG body size on a phone held at arm's length across a table.
* **Spacing and radii.** 4 pt base grid; radii 6 / 10 / 14 / 20, with consistent radius-to-padding ratios for a continuous-corner feel.
* **Materials.** Three defined vibrancy levels (`--material-thin`, `--material-regular`, `--material-thick`) as a translucent warm-white ground plus `backdrop-filter: saturate(180%) blur(Npx)`, applied **only** to sheets, popovers, the toolbar, and the tab bar — never to scrolling content, where backdrop filters are a known scroll-jank source. On a light ground the material must stay light: translucent white over content, with `--hairline` as the edge that separates it, never a dark scrim. Audit the two existing `backdrop-filter` uses against this rule.
* **Elevation.** Two shadow recipes only (popover, sheet), tuned for a light ground — short, low-opacity, blue-ash-tinted rather than neutral black, so raised surfaces read as lifted paper. No decorative glow shadows on interactive controls; the existing ember glow effects go away with the dark theme.

**2. The flame-and-ash palette.** Defined on bare `:root` as the light default, redefined under `@media (prefers-color-scheme: dark)` guarded as `:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]` so an explicit in-app override wins in both directions. Every ratio below was computed against its own ground, not inherited from a reference palette.

**Light — the default.**

| Token | Value | Role | Contrast vs `--bg` |
| :--- | :--- | :--- | ---: |
| `--bg` | `#FBFAF8` | Warm white page | — |
| `--surface` | `#FFFFFF` | Raised card, sheet, row | 1.04 |
| `--surface-sunken` | `#F2F4F8` | Ash-tinted well, input, inset list | 1.06 |
| `--ink` | `#1C2330` | Blue-ash near-black, primary text | **15.11** |
| `--ink-secondary` | `#3F4D64` | Labels, secondary text | **8.19** |
| `--ink-tertiary` | `#586780` | Captions, metadata, placeholders | **5.49** |
| `--hairline` | `#DBE0E9` | Decorative separators only | 1.27 |
| `--border-control` | `#74829B` | Boundaries that *identify* a control | **3.72** |
| `--ember` | `#B8430F` | Ember text and icons — hue 18.5 | **5.23** |
| `--ember-fill` | `#B8430F` | Filled primary action (white label: **5.46**) | — |
| `--ember-tint` | `#FDF1EA` | Chip / badge ground (ember text on it: **4.92**) | 1.07 |
| `--ember-decor` | `#D97538` | Warm ember, **decoration only** — fails as text (3.07) | — |
| `--focus` | `#D4541A` | Focus ring, one value for both themes | **3.96** (dark: 4.35) |
| `--success` | `#1A6E93` | Stabilised, friendly, complete — hue 198.3 | **5.45** |
| `--success-tint` | `#EBF5F9` | Success chip ground (success on it: **5.06**) | 1.10 |
| `--danger` | `#A51D22` | Dying, hostile, destructive — hue 357.8 | **7.19** |
| `--danger-tint` | `#FAEBEB` | Danger chip ground (danger on it: **6.48**) | 1.10 |

**Dark — secondary inversion.** `--bg` `#13171E`, `--surface` `#1A202A`, `--ink` `#E9ECF0` (15.16), `--ink-secondary` `#A3AFC4` (8.12), `--ink-tertiary` `#8491A9` (5.65), `--hairline` `#29313F`, `--border-control` `#5C6B84` (3.33), `--ember` `#E8803C` (6.49), `--success` `#49B1DF` (7.39), `--danger` `#E25A5F` (5.01). Ember fill stays `#B8430F` with a white label (5.46). `--focus` is unchanged at `#D4541A` (4.35) — the one ember value clearing 3:1 on both grounds, which is why it is the ring in both themes.

**The hue system.** Three deliberate positions on the wheel, so each accent means one thing and nothing else:

| Family | Hue | Saturation | Role |
| :--- | ---: | ---: | :--- |
| Ember | 18.5° | 85 % | The one warm accent — primary action, spotlight, live state |
| Success | 198.3° | 72 % | **Exactly 180° opposite the ember**, so it reads as the ember's counterpart |
| Danger | 357.8° | 70 % | True crimson, pulled clear of the ember |
| Ash (greys) | 218° | 16–26 % | All structure: ink, borders, tones, inactive states |

Success sits on the ember's exact complement rather than on an arbitrary blue — that is what makes the two read as a pair rather than as two unrelated colours competing on the same screen.

**Danger moved off the ember's shoulder.** The earlier `#A8321F` sat at hue 8.3°, only **10° from the ember** — on a light ground, at chip and icon size, a destructive state and a primary action would have been easy to confuse. `#A51D22` is a true crimson at 357.8°, **20.5°** clear of the ember and unmistakably a different colour at a glance. It also gains contrast, 6.41 → **7.19**.

**Greys: bluer, still desaturated.** All ash tokens are unified on hue **218°** with saturation lifted about six points — light `--ink-tertiary` 13 % → 19 %, `--border-control` 10.5 % → 16.5 %. Lightness is held, so the ramp's character is unchanged and every contrast ratio moved in the safe direction or held: light `--ink-tertiary` 5.27 → **5.49**, `--border-control` 3.58 → **3.72**. On the dark side, raising saturation darkens light values slightly, so `--border-control` was lifted in lightness to hold **3.33** rather than drifting to 3.06 against its 3:1 floor. The greys are now clearly blue-ash in isolation while still reading as neutral beside the ember.

**Two border tokens, deliberately.** WCAG 1.4.11 non-text contrast applies to boundaries that *identify a control or its state*, not to decorative rules. A single "all borders ≥ 3:1" rule would force every hairline to `--border-control` and make a light interface look caged. So `--hairline` stays quiet at 1.27 for separators between rows and sections, while `--border-control` clears 3.72 and is mandatory wherever the border is the only thing saying "this is a field / an unfilled button / a selected cell." The design-system lint enforces which token may appear in which context. *(This corrects the earlier draft of this plan, which applied the 3:1 floor to all control borders.)*

**The sparseness rule, with teeth.** Ember is the product's one loud colour and drifts into decoration if left unbudgeted:

* At most **one** ember-filled element per screen region — the primary action. Everything else in that region is ink, ash, and surface.
* Ember is otherwise reserved for *meaning*: the active initiative spotlight, an actionable reveal, a lit torch running down, a committed destination.
* Ember is never a large-area background, never a page header fill, never a body-text colour for prose.
* `--ember-decor` is banned from any text or icon rule by lint, because at 3.07 it cannot carry one.
* Ash grey carries all structure — borders, tones, dividers, inactive states, map terrain neutrals.

**Contrast floor, asserted by test.** 4.5:1 for all text at every ink tier (the tertiary tier is specified at 5.27 precisely so no text rung is ever sub-body-legal), 3:1 for `--border-control`, `--focus`, and state indicators, in **both** themes. The token-contrast test computes the ratios from `tokens.css` itself, so a future palette edit that breaks the floor fails the build rather than shipping.

**3. Controls.** Build the HIG primitive set once in `src/client/ui/`: push button (filled / tinted / plain), segmented control (the correct control for tab-like switching), stepper (the correct control for ±1/±5 HP, replacing ad-hoc button pairs), switch, slider, list row with disclosure, sheet, popover, toolbar, search field, and an empty-state block. Every surface composes these; no surface hand-rolls a control.

**4. Targets and ergonomics.** Minimum hit area 44×44 pt on touch and 28 pt on pointer, enforced by a test that walks the built CSS for interactive selectors. The table host's display is read at distance — large numerals, high contrast, no hover-only information.

**5. Motion.** One curve set, all compositor-only (`transform`, `opacity`):

| Use | Duration | Curve |
| :--- | :--- | :--- |
| Control state (press, toggle) | 120 ms | `cubic-bezier(0.25, 0.1, 0.25, 1)` |
| Sheet / popover present | 300 ms | spring-like `cubic-bezier(0.32, 0.72, 0, 1)` |
| Turn spotlight move | 220 ms | same spring |
| Reveal (fog, discovery) | 400 ms | ease-out, one element at a time |

Ban `transition: all` — three instances exist today in `src/client/styles.css` (lines 1386, 1413, 2037); they animate layout properties and defeat the compositor. Retire the three `infinite` keyframe animations (`pulse-border`, `pulse-glow`, `pulse-ring`) in favour of a single shared, pausable attention pulse that runs **only** while the thing it marks is actionable — infinite animations on a phone propped against a dice tray burn battery for hours of a session. Honour `prefers-reduced-motion: reduce` globally (currently absent): cross-fades replace movement, and reveals become instant.

**6. Keyboard and focus.** The host runs on a computer; the caller's hands are on a keyboard. Full keyboard operation of every committing action, a visible `:focus-visible` ring drawn from tokens, correct focus trapping and restoration in sheets, `Esc` to dismiss, `⌘K` for the Codex, and a printed shortcut list in the Codex itself.

**7. Platform integration for phones.** Add `viewport-fit=cover` plus `env(safe-area-inset-*)` padding on the tab bar and toolbar; `-webkit-tap-highlight-color: transparent` with real pressed states replacing it; `text-size-adjust: 100%`; `overscroll-behavior: contain` on scrollers; a web-app manifest with maskable icons and `display: standalone` so a phone can be added to the home screen and opened as the table's second screen; `theme-color` for both schemes. None of this exists today.

### E. Touch and gesture quality

1. **Pinch-to-zoom on the map and site graphs.** Two-pointer scale is the expected gesture on a phone and is currently absent — zoom is slider-only. Implement with pointer events, apply scale to a CSS custom property during the gesture, commit on `pointerup`. Keep the slider for pointer devices.
2. **Wheel and trackpad.** `⌘`/`ctrl`-wheel and trackpad pinch zoom; two-finger pan; momentum left to the browser's own scroller, which `MapViewport` correctly preserves.
3. **Double-tap to zoom to a hex; long-press for the hex's context popover.**
4. **Drag-versus-tap discipline.** The existing 4 px `PAN_THRESHOLD` and click-swallowing in `MapViewport` are the right mechanism; extend the same guard to the site graph and any future draggable surface rather than reinventing it.
5. **Scroll containment.** Every independently scrolling region gets `overscroll-behavior: contain` so a flick inside the initiative list never rubber-bands the page behind it.

### F. Session continuity

A table session runs for hours across screen locks, Wi-Fi handoffs, and a phone in a pocket. Requirements:

1. **Resume, never reload.** On reconnect the client sends its last known per-slice revisions; the server replies with the slices that moved. A full snapshot is sent only when the gap is too large to patch.
2. **Honest connection state.** Three visible states — live, reconnecting, offline — and while not live, committing controls are disabled with a reason, not silently dropped. No optimistic echo survives a disconnect.
3. **Crash and reopen.** The client persists only the device token and UI preferences, never campaign truth. Reopening a tab mid-session restores the same tab, scroll position, and selected character.
4. **Host restart.** SQLite is the source of truth; a host process restart must restore the table with no player action beyond automatic reconnection. Covered by a test that stops and restarts the server mid-session.

### G. Guardrails that must not regress

These are the product's integrity promises and each already has tests. Every workstream above must leave them green **without editing the test**:

* No roll-to-hit or damage automation anywhere in the UI.
* Player projections omit unrevealed hex names, biomes, threat tiers, landmarks, undiscovered sections, and generation metadata.
* Monster AC is `?` until tested; HP is narrative until bloodied.
* Traps show the sensory tell only until investigated.
* Secret path selection never appears in names, ids, seeds, logs, or socket acknowledgements.
* Mutations are receipted and revision-guarded; a replayed `actionId` is idempotent.

Add one new guardrail test class: **a projection-diff fuzzer** that drives random legal mutations and asserts no player projection ever gains a field the pre-slicing projection would have withheld.

### H. Verification and CI gates

The suite today is 219 strong on rules, database, and sockets, and **zero** on rendering, latency, or accessibility. Add five harnesses:

1. **Payload budget test.** Drives a scripted session and asserts p95/p99 broadcast bytes against §3. Fails the build on regression. This is the cheapest possible guard on the most expensive past mistake.
2. **Render-count test.** Renders each surface, applies a single-field mutation, asserts the number of component renders is bounded (for example, an HP tick re-renders at most three components). Catches the monolith reappearing.
3. **Interaction latency harness.** Drives the real server and a headless client over a local socket; measures intent-to-echo and intent-to-confirm; asserts §3 budgets. Reported per commit so the numbers are a tracked series, not folklore.
4. **Design-system lint.** Static checks over `src/client/**`: no `transition: all`; no colour literals outside `tokens.css`; no `backdrop-filter` outside the material classes; no interactive selector below the 44 pt target; every `@keyframes` either finite or pausable; `prefers-reduced-motion` block present. Plus the palette rules: `--ember-decor` never appears in a `color`, `fill`, `stroke`, or `border-color` declaration; `--hairline` never used as a control-identifying boundary and `--border-control` never used as a decorative separator; no ember token used as the `background` of a region above a bounded area; and a per-surface ember budget so at most one filled ember element exists per region.
5. **Token-contrast test.** Parses `tokens.css`, computes WCAG ratios for every ink-on-ground and border-on-ground pair in **both** themes, and fails the build below the §D.2 floors. This is what keeps the palette honest through later edits.

Plus axe-core accessibility assertions per surface, and a trace-based frame check on map pan and site-graph pan.

---

## 5. Delivery phases

Each phase is independently shippable at the table and ends on a measured gate. Phase 1 exists because nothing else in the plan delivers its promised feel until the wire is fixed.

### Phase 1 — Fix the wire (foundation)

Slice the projection; version per slice; project once per role; paginate `rolls`/`notes`; move `zone-profiles` off the wire; replace `volatile.emit` with a reliable emit; add the payload budget test.

**Gate:** routine-mutation broadcast ≤ 4 kB p95 (from ~62.8 kB). One projection per role per broadcast. 219 existing tests green, unmodified.

### Phase 2 — Fix the client spine

External store with selector subscriptions; `App.tsx` decomposed into per-surface route chunks; geometry memoised; render-count test added; code splitting with idle prefetch.

**Gate:** HP tick re-renders at most three components. Initial JS ≤ 90 kB gzip, any route chunk ≤ 60 kB gzip. Tab switch ≤ 50 ms.

### Phase 3 — The design system

`tokens.css` with the flame-and-ash palette; migration of the 2 544-line dark stylesheet onto it; the HIG control set in `src/client/ui/`; type scale; light default and dark inversion; materials and elevation; motion curves; `prefers-reduced-motion`; focus and keyboard; safe areas, manifest, tap-highlight and text-size-adjust; design-system lint; token-contrast test; axe per surface.

**Gate:** every surface composed from `ui/` primitives. Zero colour literals outside tokens. Contrast floor met in both themes, computed from `tokens.css`. Ember budget respected on every surface. Zero `transition: all`. No unconditional infinite animation. Axe clean.

### Phase 4 — Feel

Optimistic echo for the allowlisted numeric intents with the reveal ban enforced by test; reconciliation transitions; pinch, double-tap, long-press; spotlight and reveal motion; the latency harness.

**Gate:** tap-to-echo ≤ 16 ms; tap-to-confirm ≤ 100 ms p95; observer ≤ 150 ms p95; zero long tasks during map pan at 120 Hz.

### Phase 5 — Endurance

Slice-revision resume; three-state connection UI with disabled committing controls; host-restart recovery test; four-hour soak with six simulated phones watching memory, socket churn, and SQLite growth; cold-load budget on a throttled mid-range phone profile.

**Gate:** reconnect to correct state ≤ 1 s. Host restart transparent to players. Four-hour soak with no memory growth trend and no dropped mutation. Cold load ≤ 1.5 s to interactive.

---

## 6. Risks and how they are handled

| Risk | Handling |
| :--- | :--- |
| Slicing the projection widens visibility and leaks a secret | Fog filtering stays inside each slice projector; existing fog tests run unmodified; add the projection-diff fuzzer before shipping Phase 1 |
| Optimistic echo flashes a wrong value | Echo restricted to a tested allowlist of reversible numeric intents; reveals are server-only, by test |
| Decomposing a 6 724-line file breaks behaviour nobody wrote a test for | File-by-file, behaviour-unchanged steps, each green on all 219 tests; no rewrite branch |
| A light interface loses the campaign's character | Ember and blue-ash carry the identity at accent weight, and the serif in-world voice is retained for prose; warmth comes from the warm-white ground and ember accents, not from darkness |
| Ember creeps back into decoration until nothing reads as primary | The sparseness rule in §D.2 is lint-enforced, including a per-surface ember budget and a ban on `--ember-decor` in text |
| Performance work regresses quietly later | Payload, render-count, latency, and design-lint gates fail the build, not the review |
| Plan scope creeps back toward a VTT | §7 of the Minimal Specification is binding; this plan adds no features |

---

## 7. Explicitly out of scope

This plan does not add dice automation, combat simulation, grid tactics, monster AI, cloud sync, accounts, telemetry, or any new game content. It changes how the agreed product performs, looks, and feels — and nothing about what it is.

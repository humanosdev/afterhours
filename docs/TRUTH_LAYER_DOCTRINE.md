# Truth Layer Doctrine — governing intelligence model

**Status:** Architecture lock **2026-05-18** — doctrine only, not implementation  
**Authority:** **PRIMARY** — all map/presence/native evolution must cite a layer before shipping  
**Related:** [IMPLEMENTATION_DECISION_FRAMEWORK.md](./IMPLEMENTATION_DECISION_FRAMEWORK.md) · [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md) · [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) · [DOCUMENTATION_GOVERNANCE.md](./DOCUMENTATION_GOVERNANCE.md)

**Implementation lock:** Native must not reinterpret Intencity. Follow [IMPLEMENTATION_DECISION_FRAMEWORK.md](./IMPLEMENTATION_DECISION_FRAMEWORK.md) for every change.

---

## Core realization (read first)

Native precision is **not** “more accurate GPS.” It is **five separable systems**:

| Layer | Name | PWA today | Native future |
|-------|------|-----------|---------------|
| **1** | Location acquisition precision | Partial (`watchPosition`, shell 12s ping) | Trustworthy foreground GPS, permission UX |
| **2** | Movement interpretation | **Absent** | Velocity, heading, dwell, motion class |
| **3** | Presence confidence | **Partial** (coord + zone FSM + freshness windows) | Multi-signal confidence scoring |
| **4** | Visual interpolation | **Partial** (marker lerp, heat breathe) | Smooth markers without false certainty |
| **5** | Battery / background intelligence | **Absent** (web limits) | Adaptive refresh, background policy |

The PWA machine today is:

```
GPS coordinate snapshots
  → distance checks
  → venue zone FSM (inner_pending → inner_confirmed)
  → freshness windows (4m / 20m / 60m)
  → UI interpretation (inside, nearby, live, recent, online, ghost)
```

The PWA answers: **“Where were you recently?”**  
It does **not** answer: **“Where are you continuously and confidently?”**

That distinction is the foundation of native evolution.

---

## Philosophy: believable social geography

Intencity succeeds when users subconsciously trust:

> *“Yeah… this city actually understands where people are.”*

| Principle | Means |
|-----------|--------|
| Trust > spectacle | No flashy map before confidence |
| Coherence > flashy realtime | Poll + sub beats update spam |
| Confidence > update spam | Fewer honest updates beat jittery many |
| Continuity > teleportation | Smooth motion must not lie |
| Semantic truth > shortcuts | Same words, same rules |
| Believable > exaggerated | Heat without counts = trust collapse |

We are **not** building “a map with effects.”  
We **are** building a **socially believable spatial system.**

**GPS is fuel. Semantics are the product.**

---

## Truth layer hierarchy (L0–L5)

Higher layers **constrain** lower layers. Never implement L5 before L1–L3 are honest.

### L0 — Product Truth

**Purpose:** Why Intencity exists; what “success” means for social geography.

| Invariant | Example |
|-----------|---------|
| Users trust venue/social placement | “People are actually there” |
| Campus social graph is the core loop | Friends, moments, venues |
| Ghost mode is a first-class privacy right | Hide without lying to self |

**May evolve:** Product positioning, new surfaces — **only** with explicit product review.  
**Must stay fixed:** Believable geography as north star.

**Anti-patterns:** Shipping spectacle features to demo investors; treating map as wallpaper.

---

### L1 — Semantic Truth

**Purpose:** What words and states **mean** — independent of how we acquired coordinates.

| Invariant | PWA source |
|-----------|------------|
| `inside` / `nearby` | `inner_radius_m` / `outer_radius_m` + distance |
| `live` vs `online` vs `recent` | 20m / 4m / 60m — **never collapsed** |
| `ghost` | Hiding location; overrides display |
| `combined_count` | red + green, `isPresenceLive` only |
| Checkpoint order | activity desc → distance asc |
| Moment vs share | `is_share` flag; rail vs feed |

**Native opportunities:** None at L1 — **parity only** until product redesign.  
**Anti-patterns:** Using “live” badge for 20m heat eligibility; catalog-order checkpoints labeled “hot.”

**Examples:** [PWA_BEHAVIORAL_TRUTH_AUDIT.md §2–§3](./PWA_BEHAVIORAL_TRUTH_AUDIT.md)

---

### L2 — Presence Truth

**Purpose:** How certain we are that a user’s **semantic** placement is correct — DB row + rules, not pixels.

| Invariant | PWA today |
|-----------|-----------|
| Zone FSM | `inner_pending` → 60s → `inner_confirmed` |
| Write shape | `user_presence` upsert from `computePresenceFromGps` |
| Stale exclusion | `getPresenceFreshness === "stale"` dropped from maps |
| Fallback filter | `isLikelyMapFallbackPresence` — no Philly pile-up |
| Single writer | Web only ([PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)) |

**May evolve (native, architecture only today):** Confidence scoring combining GPS quality + dwell + continuity — **must not** change L1 labels without product sign-off.

**Anti-patterns:** Writing presence from two clients; showing inner_confirmed on one jittery fix.

**See:** [PRESENCE_TRUST_ARCHITECTURE.md § Presence confidence](./PRESENCE_TRUST_ARCHITECTURE.md)

---

### L3 — Visual Truth

**Purpose:** What the UI **shows** must not imply more certainty than L2 supports.

| Invariant | Rule |
|-----------|------|
| No fake heat | No glow without `combined_count` rules |
| No stale “live” | Badge copy must match freshness function |
| No fake density | Sheet `—` not `0` when unknown |
| Honest empty | “Not available yet” > invented numbers |
| Interpolation honesty | Smooth marker ≠ confirmed zone transition |

**PWA successes:** Ghost copy; heat tied to `getCountsForVenue`; deny-GPS keeps last fix.  
**PWA failures / drift:** `venue-core` layer opacity 0 (dead); native “Nearby” for all friends; catalog checkpoints without activity.

**Anti-patterns:** Animated city energy before read path; pulsing rings on stale rows.

**See:** [PRESENCE_TRUST_ARCHITECTURE.md § Visual honesty](./PRESENCE_TRUST_ARCHITECTURE.md)

---

### L4 — Performance Truth

**Purpose:** Loading, skeletons, refresh, and perceived responsiveness **without** changing meaning.

| Invariant | Example |
|-----------|---------|
| `feedReady` gates hub | No flash of empty social graph |
| Skeleton before content | Core Feel Lock |
| `presenceClock` | Re-render subtitles without lying about DB |
| Pull-to-refresh | Full reload (PWA) — **PWA-LIAB** |

**May evolve:** Epoch invalidation vs reload; native prefetch — **semantics unchanged**.

**Anti-patterns:** Skipping loading states on map presence; infinite spinner without cap (hub 10s cap is **HEUR** safety).

---

### L5 — Enhancement Layer

**Purpose:** Execution improvements that **amplify** L1–L3 when foundation is solid.

| Enhancement | Blocked until |
|-------------|---------------|
| GPU heatmap / glow | L2 read parity + L3 honest counts |
| District flow animation | Same |
| Auto-tour | Checkpoint sort (L1) + presence read |
| Marker 60fps lerp | L3 rules for stale/fallback hide |
| Adaptive GPS / background | L2 write authority + confidence policy |
| Predictive movement | **MAP-D** product + privacy — not pre-confidence |

**Anti-patterns:** **Alive city** visuals (heat, live markers, animated density) before confidence architecture — **trust collapse risk #1**.

---

## Semantic parity vs execution evolution

| | Semantic parity | Execution evolution |
|---|-----------------|---------------------|
| **Definition** | Same meanings, classifications, windows, visibility | Better acquisition, refresh, rendering, battery |
| **Examples** | 4m online ≠ 20m live; ghost suppresses markers | Kalman smooth, 3s→adaptive poll, GPU heat |
| **Native rule** | **Required** before claiming parity | **Allowed** after L1–L3 gates |
| **Failure mode** | “Looks native” but wrong words | Right words, jittery execution |
| **Doc authority** | [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) | [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) |

**Silent semantic drift is worse than slow execution.**

---

## Engineering decision filter

Every future map/presence feature must answer:

1. **Which truth layer does this affect?** (L0–L5)
2. **Does this increase or decrease trust?**
3. **Does this imply false certainty?** (L3 violation)
4. **Is this semantic (L1) or purely visual/performance (L3–L5)?**
5. **Is this enhancement before foundation?** (L5 before L2)
6. **Does this preserve believable social geography?**

If any answer is “decreases trust” or “false certainty” → **stop** or downgrade to honest stub.

---

## Relationship to code hierarchy

Docs describe **product** layers (L0–L5). Implementation dependency order remains:

```
Auth → social graph → GPS → presence write FSM → user_presence row
  → freshness windows → visibility filters → aggregation → presentation
```

See [PWA_BEHAVIORAL_TRUTH_AUDIT.md §10](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) for implementation L0–L12.

**L1 semantic truth maps to implementation layers 5–9.**  
**L2 presence truth maps to layers 3–4.**  
**L5 enhancements map to map layers, heat, auto-tour — last.**

---

## Cross-links

| Doc | Role |
|-----|------|
| [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md) | Confidence model, risks, philosophy |
| [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) | Trust-first phase renames and gates |
| [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) | What PWA actually does today |
| [DOCUMENTATION_GOVERNANCE.md](./DOCUMENTATION_GOVERNANCE.md) | Which doc wins when they conflict |

---

*Doctrine lock — no map/presence implementation without citing affected truth layer(s).*

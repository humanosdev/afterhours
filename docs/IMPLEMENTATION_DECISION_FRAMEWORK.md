# Implementation Decision Framework — HARD RULE

**Status:** Binding for **all** phases: VP-2, P2O-B/C/D, MAP-B/C/D, and future native work  
**Authority:** **PRIMARY** — equal to [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md)  
**Effective:** 2026-05-18

---

## Non-negotiable premise

**Native is NOT allowed to become a reinterpretation of Intencity.**

The PWA remains the **semantic and behavioral source-of-truth** unless explicitly reclassified in doctrine docs.

We are **NOT** building:

- a cooler native app
- a redesigned map
- a different interaction model
- a feature remix

We **ARE** building:

- the **exact same** social geography engine
- with more **truthful** execution
- more **continuity**, **confidence**, **smoothness**, **battery intelligence**, **visual fidelity**, **native precision**

**Without changing underlying meanings.**

---

## Mandatory process (every major change)

### 1. Audit PWA first

Before implementing **any** native behavior:

- [ ] Identify exactly how PWA behaves today
- [ ] Identify semantic meaning (L1)
- [ ] Identify timing / freshness rules
- [ ] Identify visual honesty (L3)
- [ ] Identify known PWA limitations (WEB-WA, PWA-LIAB)
- [ ] Classify CANON vs HEUR vs TEMP vs WEB-WA
- [ ] Separate product semantics from execution constraints

**Source:** [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md)

### 2. Classify the change

| Question | If yes → |
|----------|----------|
| Semantic parity? | Must match PWA meaning exactly |
| Execution evolution? | May improve engine; semantics frozen |
| Visual interpolation? | L4 — must not exceed L2 confidence |
| Confidence architecture? | L2 — architecture doc first |
| Speculative behavior? | Block unless MAP-D + product |
| Violates believable social geography? | **Do not ship** |

### 3. Native may improve execution — NOT meaning

| GOOD (execution) | BAD (semantic drift) |
|------------------|----------------------|
| Smoother interpolation | New freshness meanings |
| Adaptive GPS | Changed venue zones without product |
| Better loading / skeletons | Changed ghost semantics |
| GPU rendering | Changed “live” interpretation |
| Confidence-aware visuals | Fake marker continuity |
| Better caching | Artificial activity |
| Truthful freshness handling | Visual confidence > actual |
| Movement continuity | Speculative positioning |

### 4. “Better” means

| Yes | No |
|-----|-----|
| More trustworthy | More flashy |
| More believable | More animated |
| Smoother | More cluttered |
| More technically precise | More speculative |
| More continuous | More socially fake |
| More battery-aware | |
| More performant | |
| More visually honest | |

### 5. PWA limitations — understand, don’t copy blindly

Ask:

- **Why** does PWA behave this way?
- Is it **web limitation** or **product semantics**?
- Can native improve **execution** while preserving **semantics**?

Example:

```
PWA:  GPS snapshot → venue classify
Native: continuous acquisition → confidence → SAME semantic classify
```

Same **product**. Better **engine**.

### 6. Every map/presence PR must ask

> **“Does this increase believable social geography?”**

If **no** → it likely should not exist.

### 7. Current priority

**VP-2 / Core Feel Lock** until app-wide polish is production-grade.

**Do not** jump to spectacle, alive-city, fake energy, heat before confidence, or realtime visuals before semantic validation.

See [VP2_APP_WIDE_AUDIT.md](./VP2_APP_WIDE_AUDIT.md).

---

## PR checklist (copy into description)

```markdown
## Implementation decision framework

- [ ] PWA behavior audited (link to PWA_BEHAVIORAL section or note)
- [ ] Change type: semantic parity | execution evolution | visual | confidence | blocked speculative
- [ ] Truth layer(s) affected: L_
- [ ] Trust: increases / neutral / decreases believable social geography
- [ ] False certainty risk: none / mitigated / N/A
- [ ] Enhancement before foundation: no
- [ ] TRUTH_DRIFT_REGISTER checked
```

---

## Cross-links

| Doc | Role |
|-----|------|
| [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md) | L0–L5 |
| [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md) | Trust philosophy |
| [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) | Phase gates |
| [DOCUMENTATION_GOVERNANCE.md](./DOCUMENTATION_GOVERNANCE.md) | Doc authority |

---

*Violations of this framework are architecture defects, not style preferences.*

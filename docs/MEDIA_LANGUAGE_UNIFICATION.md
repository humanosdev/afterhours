# Moment vs share — language & database

## Product model (unchanged)

| Kind | DB | Where it shows |
|------|-----|----------------|
| **Moment** | `stories.is_share = false` (or null + no expiry) | Hub moments rail, 24h viewer |
| **Share** | `stories.is_share = true` | Hub feed, profile grid, `/moments/[id]` |

Both rows live in **`public.stories`** — one table, one flag.

---

## What we unified in code (no SQL required)

**Single source of truth:** `packages/shared/src/mediaLexicon.ts`

- Exported as `@intencity/shared`
- Mobile: `apps/mobile/src/content/mediaLexicon.ts` re-exports
- Web: `apps/web/src/content/mediaLexicon.ts` re-exports

**Helpers (use everywhere instead of branching copy):**

```ts
import { storyContentKind, storyKindLabel, storyKindLabelFromRow, mediaLexicon } from "@intencity/shared";

storyContentKind(row.is_share); // "moment" | "share"
storyKindLabelFromRow(row.is_share); // "Moment" | "Share"
mediaLexicon.share.delete; // fixed strings
```

**What you need to run:** nothing on Supabase. Reload apps after pull:

```bash
npm install   # repo root — refreshes workspace links
npm run dev:mobile
# web: npm run dev (from apps/web or root script)
```

Optional check:

```bash
npm run test:shared
```

---

## Viewer chrome (2026-06)

Story viewer header uses a **plain avatar** (no story ring / glow). Rings stay on hub rail and profile only.

---

## Database: do you need a migration?

**Not for copy unification.** Labels are app-layer only.

**Keep `is_share`** unless you plan a large migration. It drives:

- RLS (`stories_select_policy` share vs moment branches)
- Hub feed queries (shares only)
- Moments rail (non-share + expiry)
- Notifications grouping (`story_is_share` in feed payloads)

### If you ever rename in the DB (future, optional)

Would require a phased migration, e.g.:

1. Add `content_kind text check (content_kind in ('moment','share'))`
2. Backfill from `is_share`
3. Update RLS, RPCs, and all `.eq("is_share", …)` queries
4. Drop `is_share` after cutover

**Do not do this lightly** — estimate 1–2 PRs + full regression on hub, viewer, profile, notifications.

---

## SQL you may still need (other features)

| Migration | When |
|-----------|------|
| `zzz_moderation_reports_admin.sql` | Reporting + admin queue |
| `zzz_public_profile_moments_select.sql` | Public profile moments |
| `zzz_message_story_reply.sql` | Story reply in chat |

Run in Supabase SQL Editor (or `supabase db push`) per environment.

---

## Wording changes (product)

To call everything one name (e.g. all “Post”), edit **only** `packages/shared/src/mediaLexicon.ts` and redeploy — DB flag still separates feed vs ring behavior.

To merge into one content type in the DB, that is a separate engineering project (see above).

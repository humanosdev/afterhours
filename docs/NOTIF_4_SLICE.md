# NOTIF-4 — native device push (Expo)

**Era:** 2 — Notifications  
**Status:** Code shipped · **iOS OS delivery → [NATIVE_CUTOVER_PT2.md](./NATIVE_CUTOVER_PT2.md)**  
**Depends on:** NOTIF-2 (rows created on native), NOTIF-3 (in-app UX)

---

## Shipped

| Piece | Detail |
|-------|--------|
| **Token registration** | `expo-notifications` → `push_subscriptions` row (`endpoint` = `expo:{token}`) |
| **Send path** | PWA `POST /api/push/notify` fans out **Web Push** + **Expo** (service role) |
| **Quiet hours** | Honored server-side via `@intencity/shared` `isWithinQuietHours` |
| **Story grouping** | No push from 4th+ distinct liker/commenter (same as PWA) |
| **Tap → route** | `data.route` opens `/chat/:id`, `/moments/:id`, `/notifications` |
| **Settings** | Toggle push → register/unregister token |

**Not in NOTIF-4:** presence-driven pushes (`friend_online`, …) — still web until **P2O-D**.

---

## Env / infra (required for real pushes)

### Mobile (`apps/mobile/.env`)

```bash
EXPO_PUBLIC_EAS_PROJECT_ID=<uuid from expo.dev / eas init>
EXPO_PUBLIC_WEB_ORIGIN=https://getintencity.com   # or local web for dev
```

Rebuild **dev client** after adding `EXPO_PUBLIC_EAS_PROJECT_ID` and the `expo-notifications` plugin.

### Web (Vercel / `.env.local`)

```bash
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   # PWA web push
VAPID_PRIVATE_KEY=...
EXPO_ACCESS_TOKEN=...              # optional; recommended for Expo push API
```

Push registration uses a **physical device** (not simulator).

### iOS (Part 2 — Apple Developer Program required)

Remote push on `com.intencity.app` requires paid enrollment: Push capability on App ID, APNs key, provisioning profile with `aps-environment`. Without it, `push_subscriptions` stays empty on iPhone and builds fail if push entitlements are enabled.

**Interim:** in-app notifications + Realtime toasts work. Validate OS push on **Android** or **PWA web push** until Part 2.

See [NATIVE_CUTOVER_PT2.md](./NATIVE_CUTOVER_PT2.md).

---

## QA checklist

### Register

- [ ] Signed in on **physical** iPhone/Android dev build
- [ ] Settings → Notifications → **Push** on → Save → no error banner
- [ ] Supabase `push_subscriptions` has row with `endpoint` like `expo:ExponentPushToken[...]`

### Receive (backgrounded)

- [ ] **B** backgrounds app (or locks phone)
- [ ] **A** sends **B** a DM from native
- [ ] **B** gets OS notification; tap opens chat thread

### Like / comment

- [ ] **A** likes **B**’s share on native → **B** gets push (if Stories enabled)
- [ ] **B** quiet hours 22:00–07:00 (local) → **no** push during window; in-app row may still appear

### Prefs

- [ ] **B** disables Push → save → expo rows removed from `push_subscriptions`
- [ ] **B** disables Messages → DM creates no row and no push

### Regression

- [ ] Foreground DM still shows in-app toast (NOTIF-3)
- [ ] PWA web push still works for browser subscriptions (non-`expo:` endpoints)

---

## Next

**P2O-D** — native `user_presence` writer + presence-driven notification creates ([P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md)).

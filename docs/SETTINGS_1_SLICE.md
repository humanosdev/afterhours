# SETTINGS-1 — server prefs + account lifecycle (Era 1 Mirror)

**Date:** 2026-05-26  
**PWA reference:** `/settings`, `/settings/notifications`, `/settings/account/pause`, `/settings/account/delete`

---

## Shipped

| Feature | Native |
|---------|--------|
| **Notification prefs** | Load/save `notification_preferences` in Supabase (+ SecureStore cache) |
| **Private account** | `profiles.is_private` toggle on Settings |
| **Pause account** | `pause_my_account` RPC + sign out |
| **Delete account** | `request_account_deletion` RPC + sign out |
| **Cancel deletion** | `cancel_account_deletion` from Settings when `delete_pending` |

## Not in slice

- **Feedback API** — still disabled (needs web API URL or edge function)
- **Native device push** on enable — honest message; prefs still save (NOTIF-4)

## Files

- `apps/mobile/src/lib/notificationPreferences.ts`
- `apps/mobile/src/lib/fetchAccountSettings.ts`
- `apps/mobile/app/(app)/settings/index.tsx`
- `apps/mobile/app/(app)/settings/notifications.tsx`
- `apps/mobile/app/(app)/settings/account/pause.tsx`
- `apps/mobile/app/(app)/settings/account/delete.tsx`

## QA

1. Settings → Notification preferences → toggle → Save → reload screen (values persist)
2. Same prefs visible on PWA after save (same Supabase row)
3. Private account toggle → public profile visibility changes for non-friends
4. Pause → signed out → login restores active
5. Delete scheduled → banner on Settings → Cancel deletion works

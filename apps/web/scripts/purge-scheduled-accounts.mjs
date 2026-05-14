#!/usr/bin/env node
/**
 * Purge accounts past their delete grace period, then remove Supabase Auth users so emails can be reused.
 *
 * Prerequisites:
 * - Migration `zzz_account_lifecycle_pause_delete.sql` applied (RPC `purge_user_public_data`, columns on `profiles`).
 * - Env: `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`).
 *
 * Run locally:
 *   cd apps/web && SUPABASE_SERVICE_ROLE_KEY=xxx NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co node scripts/purge-scheduled-accounts.mjs
 *
 * Or from repo root (after adding npm script to root):
 *   npm run purge-scheduled-accounts -w web
 *
 * Automation: schedule this script (GitHub Actions, cron on a small VM, Supabase Edge Function + scheduler, etc.).
 * See `.github/workflows/purge-scheduled-accounts.yml` for a daily GitHub Actions example.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing env. Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const nowIso = new Date().toISOString();

  const { data: rows, error: selErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("account_lifecycle_state", "delete_pending")
    .not("account_purge_at", "is", null)
    .lte("account_purge_at", nowIso);

  if (selErr) {
    console.error("[purge-scheduled-accounts] Failed to list candidates:", selErr.message);
    process.exit(1);
  }

  const ids = (rows ?? []).map((r) => r.id).filter(Boolean);
  if (!ids.length) {
    console.log("[purge-scheduled-accounts] No accounts due for purge.");
    process.exit(0);
  }

  console.log(`[purge-scheduled-accounts] Found ${ids.length} account(s) to purge.`);

  let purged = 0;
  let authRemoved = 0;
  const failures = [];

  for (const id of ids) {
    const { error: purgeErr } = await supabase.rpc("purge_user_public_data", { p_uid: id });
    if (purgeErr) {
      failures.push({ id, step: "purge_user_public_data", message: purgeErr.message });
      console.error(`[purge-scheduled-accounts] Purge failed for ${id}:`, purgeErr.message);
      continue;
    }
    purged += 1;

    const { error: authErr } = await supabase.auth.admin.deleteUser(id);
    if (authErr) {
      failures.push({ id, step: "auth.admin.deleteUser", message: authErr.message });
      console.error(`[purge-scheduled-accounts] Auth delete failed for ${id}:`, authErr.message);
      continue;
    }
    authRemoved += 1;
    console.log(`[purge-scheduled-accounts] Purged public data + removed auth user: ${id}`);
  }

  console.log(
    `[purge-scheduled-accounts] Done. public_data_purged=${purged} auth_users_removed=${authRemoved} failures=${failures.length}`
  );
  if (failures.length) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

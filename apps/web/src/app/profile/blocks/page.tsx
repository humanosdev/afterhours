"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import NotificationListSkeleton from "@/components/skeletons/NotificationListSkeleton";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { AuthScreenShell } from "@/components/AuthScreenShell";
import { AppSubpageHeader, APP_TAB_BOTTOM_PADDING_CLASS, navigateBack } from "@/components/AppSubpageHeader";
import { BLOCK_OR_PRIVATE_COPY } from "@/lib/blockAndPrivateCopy";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function BlocksPage() {
  const router = useRouter();
  const goBackSafe = () => navigateBack(router, "/profile");

  const [me, setMe] = useState<string | null>(null);
  /** Accounts you blocked (you are blocker). */
  const [youBlocked, setYouBlocked] = useState<Profile[]>([]);
  /** Accounts that blocked you (you are blocked). */
  const [blockedYou, setBlockedYou] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // get current user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        setLoading(false);
        return;
      }
      setMe(data.user.id);
    })();
  }, [router]);

  const fetchBlocked = async (userId: string) => {
    setLoading(true);
    setLoadError(null);

    const [{ data: outgoing, error: outErr }, { data: incoming, error: inErr }] = await Promise.all([
      supabase.from("blocks").select("blocked_id").eq("blocker_id", userId),
      supabase.from("blocks").select("blocker_id").eq("blocked_id", userId),
    ]);

    if (outErr || inErr) {
      console.error(outErr ?? inErr);
      setLoadError("Could not load your block list. Check connection or database policies.");
      setYouBlocked([]);
      setBlockedYou([]);
      setLoading(false);
      return;
    }

    const outIds = Array.from(new Set((outgoing ?? []).map((b) => b.blocked_id).filter(Boolean))) as string[];
    const inIds = Array.from(new Set((incoming ?? []).map((b) => b.blocker_id).filter(Boolean))) as string[];
    const allIds = Array.from(new Set([...outIds, ...inIds]));

    if (allIds.length === 0) {
      setYouBlocked([]);
      setBlockedYou([]);
      setLoading(false);
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", allIds);

    if (profileError) {
      console.error(profileError);
      setLoadError("Could not load profiles for these accounts.");
      setYouBlocked([]);
      setBlockedYou([]);
      setLoading(false);
      return;
    }

    const byId = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
    const outProfiles: Profile[] = outIds.map((id) => byId.get(id)).filter(Boolean) as Profile[];
    const inProfiles: Profile[] = inIds.map((id) => byId.get(id)).filter(Boolean) as Profile[];

    setYouBlocked(outProfiles);
    setBlockedYou(inProfiles);
    setLoading(false);
  };

  // run when user loads
  useEffect(() => {
    if (me) fetchBlocked(me);
  }, [me]);

  // unblock
  const unblockUser = async (them: string) => {
    if (!me) return;

    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", me)
      .eq("blocked_id", them);

    if (error) {
      console.error(error);
      return;
    }

    window.dispatchEvent(new Event("friends-updated"));
    fetchBlocked(me);
  };

  if (loading) {
    return (
      <AuthScreenShell className={`text-white ${APP_TAB_BOTTOM_PADDING_CLASS}`}>
        <NotificationListSkeleton rows={8} />
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell className={`text-white ${APP_TAB_BOTTOM_PADDING_CLASS}`}>
      <AppSubpageHeader
        title="Blocked users"
        subtitle="People you’ve blocked and people who’ve blocked you."
        onBack={goBackSafe}
      />

      <div className="mt-6 space-y-8">
        {loadError ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">
            {loadError}
          </div>
        ) : youBlocked.length === 0 && blockedYou.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
            No active blocks in either direction.
          </div>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-white/50">You blocked</h2>
              {youBlocked.length === 0 ? (
                <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-sm text-white/45">
                  You haven’t blocked anyone. If someone blocked you, they appear below.
                </p>
              ) : (
                youBlocked.map((user) => (
                  <div
                    key={`out-${user.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.06]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        src={user.avatar_url?.trim() || null}
                        fallbackText={user.display_name || user.username || "User"}
                        size="sm"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{user.display_name || user.username || "User"}</div>
                        <div className="truncate text-xs text-white/45">
                          {user.username ? `@${user.username}` : ""}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => unblockUser(user.id)}
                      className="shrink-0 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-sm font-semibold text-white/92 transition hover:bg-white/[0.12]"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-white/50">Blocked you</h2>
              {blockedYou.length === 0 ? (
                <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-sm text-white/45">
                  No one has blocked you from this account.
                </p>
              ) : (
                <>
                  <p className="text-xs leading-snug text-white/42">{BLOCK_OR_PRIVATE_COPY.theyBlockedYouListHint}</p>
                  {blockedYou.map((user) => (
                    <div
                      key={`in-${user.id}`}
                      className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          src={user.avatar_url?.trim() || null}
                          fallbackText={user.display_name || user.username || "User"}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{user.display_name || user.username || "User"}</div>
                          <div className="truncate text-xs text-white/45">
                            {user.username ? `@${user.username}` : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </AuthScreenShell>
  );
}
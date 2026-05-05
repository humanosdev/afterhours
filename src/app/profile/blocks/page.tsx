"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import NotificationListSkeleton from "@/components/skeletons/NotificationListSkeleton";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { AuthScreenShell } from "@/components/AuthScreenShell";
import { AppSubpageHeader, APP_TAB_BOTTOM_PADDING_CLASS } from "@/components/AppSubpageHeader";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
};

export default function BlocksPage() {
  const router = useRouter();
  const goBackSafe = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/profile");
  };

  const [me, setMe] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // get current user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMe(data.user?.id || null);
    })();
  }, []);

  // fetch blocked users
  const fetchBlocked = async (userId: string) => {
    setLoading(true);

    const { data: blocks, error } = await supabase
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", userId);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const ids = blocks.map((b) => b.blocked_id);

    if (ids.length === 0) {
      setBlockedUsers([]);
      setLoading(false);
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", ids);

    if (profileError) {
      console.error(profileError);
      setLoading(false);
      return;
    }

    setBlockedUsers(profiles || []);
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
        subtitle="Accounts you’ve blocked can’t interact with you."
        onBack={goBackSafe}
      />

      <div className="mt-6 space-y-2">
        {blockedUsers.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
            No blocked users
          </div>
        ) : (
          blockedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.06]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  src={null}
                  fallbackText={user.display_name || user.username}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <div className="truncate font-medium">{user.display_name || user.username}</div>
                  <div className="truncate text-xs text-white/45">@{user.username}</div>
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
      </div>
    </AuthScreenShell>
  );
}
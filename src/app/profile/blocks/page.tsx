"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";

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
    return <div className="min-h-screen bg-black text-white p-6">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Back button */}
      <button
        onClick={goBackSafe}
        className="mb-6 text-sm text-white/60"
      >
        ←
      </button>

      <h1 className="text-2xl font-semibold">Blocked Users</h1>

      <div className="mt-6 space-y-2">
        {blockedUsers.length === 0 ? (
          <div className="text-white/40 text-sm">No blocked users</div>
        ) : (
          blockedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  src={null}
                  fallbackText={user.display_name || user.username}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {user.display_name || user.username}
                  </div>
                  <div className="text-xs text-white/40 truncate">
                    @{user.username}
                  </div>
                </div>
              </div>

              <button
                onClick={() => unblockUser(user.id)}
                className="rounded-xl bg-gray-800 border border-white/20 text-white px-3 py-2"
              >
                Unblock
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
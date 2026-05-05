"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileByIdRedirectPage() {
  const router = useRouter();
  const { user_id } = useParams<{ user_id: string }>();

  useEffect(() => {
    if (!user_id) return;

    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user_id)
        .maybeSingle();

      if (!mounted) return;
      if (data?.username) {
        router.replace(`/u/${data.username}`);
      } else {
        router.replace("/profile");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router, user_id]);

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-primary text-text-primary">
      <div className="text-sm text-text-muted">Opening profile...</div>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authed" | "redirecting">(
    "checking"
  );

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error || !data.session) {
        setStatus("redirecting");
        router.replace("/login");
        return;
      }
      setStatus("authed");
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        setStatus("redirecting");
        router.replace("/login");
        return;
      }
      setStatus("authed");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (status !== "authed") {
    return <div className="h-screen w-screen bg-primary" />;
  }

  return <>{children}</>;
}

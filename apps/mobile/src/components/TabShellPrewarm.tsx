import { useEffect } from "react";
import { useAuth } from "../providers/AuthProvider";
import { prewarmTabShellData } from "../lib/tabShellPrewarm";

/** Fills tab caches in the background so tab switches hit warm data. */
export function TabShellPrewarm() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    void prewarmTabShellData(user.id);
  }, [user?.id]);

  return null;
}

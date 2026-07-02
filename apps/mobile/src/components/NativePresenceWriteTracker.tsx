import { useEffect } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useAppLifecycle } from "../providers/AppLifecycleProvider";
import { useForegroundLocation } from "../hooks/useForegroundLocation";
import { useMyProfile } from "../hooks/useMyProfile";
import { useNativePresenceWrite } from "../hooks/useNativePresenceWrite";
import { usePresenceVenueCatalog } from "../hooks/usePresenceVenueCatalog";
import { usePresence } from "../providers/PresenceProvider";
import { requestForegroundLocationPermission } from "../lib/nativeForegroundLocation";

/** Phase 2 — production presence writer for all signed-in native users (foreground). */
export function NativePresenceWriteTracker() {
  const { user } = useAuth();
  const { isAppForeground } = useAppLifecycle();
  const { profile } = useMyProfile(user?.id);
  const { presenceRefreshBoost } = usePresence();
  const locationEnabled = Boolean(user?.id) && isAppForeground;
  const venues = usePresenceVenueCatalog(Boolean(user?.id));
  const { coords, permission } = useForegroundLocation(locationEnabled, {
    highPrecision: Boolean(presenceRefreshBoost),
    venues,
  });

  useEffect(() => {
    if (!locationEnabled || permission === "granted") return;
    void requestForegroundLocationPermission();
  }, [locationEnabled, permission]);

  useNativePresenceWrite({
    enabled: locationEnabled,
    userId: user?.id,
    profile,
    coords,
    venues,
    mapWriteBoost: presenceRefreshBoost != null,
  });

  return null;
}

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { localHourIsMapDaytime } from "../../theme/mapDayChrome";

/** PWA map edge vignette — stars live in Mapbox globe fog (world space), not here. */
export function MapAtmosphereOverlay() {
  const [dayMode, setDayMode] = useState(() => localHourIsMapDaytime());

  useEffect(() => {
    const sync = () => setDayMode(localHourIsMapDaytime());
    sync();
    const id = setInterval(sync, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.host} pointerEvents="none">
      <LinearGradient
        colors={
          dayMode
            ? ["rgba(255, 255, 255, 0.35)", "rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.28)"]
            : ["rgba(8, 13, 20, 0.34)", "rgba(8, 13, 20, 0)", "rgba(8, 13, 20, 0.28)"]
        }
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});

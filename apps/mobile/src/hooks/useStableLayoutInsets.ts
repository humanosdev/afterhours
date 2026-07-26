import type { EdgeInsets } from "react-native-safe-area-context";
import { layoutInsets } from "../theme/layoutInsets";

/** @see layoutInsets — hook form for components that already expect a hook. */
export function useStableLayoutInsets(): EdgeInsets {
  return layoutInsets;
}

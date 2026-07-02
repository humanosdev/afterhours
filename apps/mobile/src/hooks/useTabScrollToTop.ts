import { useEffect, type RefObject } from "react";
import type { ScrollView } from "react-native";
import { subscribeTabScrollToTop, type TabScrollTarget } from "../lib/tabScrollToTop";

/** Scroll main tab feed to top when the active tab icon is pressed again. */
export function useTabScrollToTop(tab: TabScrollTarget, scrollRef: RefObject<ScrollView | null>) {
  useEffect(() => {
    return subscribeTabScrollToTop(tab, () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [tab, scrollRef]);
}

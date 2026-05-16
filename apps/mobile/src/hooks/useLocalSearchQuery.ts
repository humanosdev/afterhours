import { useMemo, useState } from "react";
import { normalizeLocalSearchQuery } from "../lib/localSearch";
import { useDebouncedValue } from "./useDebouncedValue";

const DEFAULT_DEBOUNCE_MS = 280;

/**
 * Immediate `query` for the TextInput; `debouncedQuery` for filtering (no per-keystroke filter passes).
 * `intentActive` means the user entered a non-whitespace query (swap to search UI before debounce settles).
 */
export function useLocalSearchQuery(debounceMs: number = DEFAULT_DEBOUNCE_MS) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, debounceMs);
  const intentActive = useMemo(() => normalizeLocalSearchQuery(query).length > 0, [query]);

  return { query, setQuery, debouncedQuery, intentActive };
}

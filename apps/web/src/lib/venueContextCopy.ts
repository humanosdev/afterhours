/**
 * Curated venue copy stored in `venues.context_copy` (jsonb).
 * `holidays` keys may be `MM-DD` (annual) or `YYYY-MM-DD` (one-off).
 */
export type VenueContextCopyV1 = {
  default?: string;
  weekend?: string;
  holidays?: Record<string, string>;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function isWeekendNightlife(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 5 || day === 6;
}

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseVenueContextCopy(raw: unknown): VenueContextCopyV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const holidaysRaw = o.holidays;
  const holidays: Record<string, string> = {};
  if (holidaysRaw && typeof holidaysRaw === "object" && !Array.isArray(holidaysRaw)) {
    for (const [k, v] of Object.entries(holidaysRaw as Record<string, unknown>)) {
      const s = readString(v);
      if (s) holidays[k] = s;
    }
  }
  return {
    default: readString(o.default) || undefined,
    weekend: readString(o.weekend) || undefined,
    holidays: Object.keys(holidays).length ? holidays : undefined,
  };
}

/** Picks holiday → weekend → default (first non-empty). */
export function resolveVenueContextLine(now: Date, raw: unknown): string | null {
  const parsed = parseVenueContextCopy(raw);
  if (!parsed) return null;

  const y = now.getFullYear();
  const m = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());
  const iso = `${y}-${m}-${day}`;
  const md = `${m}-${day}`;

  const h = parsed.holidays;
  if (h) {
    const exact = readString(h[iso]);
    if (exact) return exact;
    const annual = readString(h[md]);
    if (annual) return annual;
  }

  const wk = readString(parsed.weekend);
  if (wk && isWeekendNightlife(now)) return wk;

  const def = readString(parsed.default);
  return def || null;
}

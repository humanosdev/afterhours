/** Where the user opened `/moments/[id]` — controls post-delete / post-hide exit. */
export type MomentDetailFrom = "profile" | "hub";

export function parseMomentDetailFrom(value: string | undefined): MomentDetailFrom | undefined {
  if (value === "profile" || value === "hub") return value;
  return undefined;
}

export function momentDetailRouteParams(storyId: string, from?: MomentDetailFrom, extra?: Record<string, string>) {
  return {
    pathname: "/moments/[id]" as const,
    params: {
      id: storyId,
      ...(from ? { from } : {}),
      ...extra,
    },
  };
}

/** Tab route after removing a share from detail, or null to pop the stack. */
export function momentDetailExitHref(from: MomentDetailFrom | undefined): string | null {
  switch (from) {
    case "profile":
      return "/profile";
    case "hub":
      return "/hub";
    default:
      return null;
  }
}

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  accessCookieName,
  hasValidMarketingAccessCookie,
  isMarketingSiteAccessRequired,
  isSiteAccessExemptPath,
} from "@/lib/siteAccess";

function requestPathname(): string {
  const h = headers();
  const fromMiddleware = h.get("x-middleware-pathname");
  if (fromMiddleware) return fromMiddleware;

  for (const key of ["x-invoke-path", "x-matched-path", "x-url", "next-url"] as const) {
    const raw = h.get(key);
    if (!raw) continue;
    if (raw.startsWith("/")) return raw.split("?")[0] ?? raw;
    try {
      return new URL(raw).pathname;
    } catch {
      /* ignore */
    }
  }

  return "/";
}

/** Server-side gate — runs on Node where Sensitive env vars are available. */
export function assertMarketingSiteAccess(): void {
  if (!isMarketingSiteAccessRequired()) return;

  const pathname = requestPathname();
  if (isSiteAccessExemptPath(pathname)) return;

  const accessCookie = cookies().get(accessCookieName())?.value;
  if (hasValidMarketingAccessCookie(accessCookie)) return;

  const next =
    pathname === "/" ? "/" : `${pathname}${headers().get("x-middleware-search") ?? ""}`;
  redirect(`/site-access?next=${encodeURIComponent(next)}`);
}

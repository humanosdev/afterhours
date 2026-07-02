import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  accessCookieName,
  hasValidMarketingAccessCookie,
  isMarketingSiteAccessRequired,
  isSiteAccessExemptPath,
} from "@/lib/siteAccess";

function requestPathname(): string {
  const fromMiddleware = headers().get("x-middleware-pathname");
  if (fromMiddleware) return fromMiddleware;

  const url = headers().get("x-url") ?? headers().get("next-url");
  if (url) {
    try {
      return new URL(url).pathname;
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

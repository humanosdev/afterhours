import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_GATE_PATH_PREFIXES } from "@/lib/authGatePaths";
import { isPublicSitePath, isMarketingBlockedPath } from "@/lib/publicSitePaths";
import { isMarketingSite } from "@/lib/webSiteMode";
import {
  accessCookieName,
  hasValidMarketingAccessCookie,
  hasValidMarketingBasicAuth,
  isMarketingApiPath,
  isMarketingSiteAccessRequired,
  isSiteAccessExemptPath,
} from "@/lib/siteAccess";
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];
const ONBOARDING_PATH = "/onboarding";

function isProtectedPath(pathname: string) {
  return AUTH_GATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function buildRequestHeaders(req: NextRequest): Headers {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-middleware-pathname", req.nextUrl.pathname);
  if (req.nextUrl.search) {
    requestHeaders.set("x-middleware-search", req.nextUrl.search);
  } else {
    requestHeaders.delete("x-middleware-search");
  }
  return requestHeaders;
}

function applyDevDocumentNoStore(res: NextResponse, req: NextRequest): NextResponse {
  if (process.env.NODE_ENV !== "development") return res;
  const p = req.nextUrl.pathname;
  if (/\.(?:ico|png|jpe?g|gif|webp|svg|json|txt|xml|webmanifest|js|css|map|woff2?)$/i.test(p)) {
    return res;
  }
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}

function middlewareNext(req: NextRequest): NextResponse {
  return applyDevDocumentNoStore(
    NextResponse.next({ request: { headers: buildRequestHeaders(req) } }),
    req
  );
}

function middlewareRedirect(url: URL | string, req: NextRequest): NextResponse {
  return applyDevDocumentNoStore(NextResponse.redirect(url), req);
}

/** Dev-only: replace production Workbox `sw.js` so browsers never precache stale `/_next/static` hashes. */
const DEV_SW_NULL =
  "self.addEventListener('install',function(e){self.skipWaiting();});" +
  "self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){" +
  "return Promise.all(ks.map(function(k){return caches.delete(k);}));}).then(function(){" +
  "return self.registration.unregister();}).then(function(){" +
  "return self.clients.matchAll({type:'window',includeUncontrolled:true});}).then(function(cs){" +
  "cs.forEach(function(c){try{c.navigate(c.url);}catch(_){}});}));});";

async function enforceMarketingSiteAccess(req: NextRequest): Promise<NextResponse | null> {
  const pathname = req.nextUrl.pathname;
  if (!isMarketingSiteAccessRequired() || isSiteAccessExemptPath(pathname)) {
    return null;
  }

  const accessCookie = req.cookies.get(accessCookieName())?.value;
  const authHeader = req.headers.get("authorization");
  if (
    hasValidMarketingAccessCookie(accessCookie) ||
    hasValidMarketingBasicAuth(authHeader)
  ) {
    return null;
  }

  const gateUrl = req.nextUrl.clone();
  gateUrl.pathname = "/site-access";
  gateUrl.searchParams.set(
    "next",
    pathname === "/" ? "/" : `${pathname}${req.nextUrl.search}`
  );
  return middlewareRedirect(gateUrl, req);
}

export async function middleware(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;
    if (pathname === "/sw.js") {
      if (process.env.NODE_ENV === "development") {
        return new NextResponse(DEV_SW_NULL, {
          status: 200,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Service-Worker-Allowed": "/",
          },
        });
      }
      return middlewareNext(req);
    }

    const accessRedirect = await enforceMarketingSiteAccess(req);
    if (accessRedirect) return accessRedirect;

    /** Phase 6: marketing-only site — block auth/product without deleting archived PWA routes. */
    if (isMarketingSite()) {
      if (pathname.startsWith("/api/")) {
        if (isMarketingApiPath(pathname)) {
          return middlewareNext(req);
        }
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (!isPublicSitePath(pathname)) {
        const homeUrl = req.nextUrl.clone();
        homeUrl.pathname = "/";
        homeUrl.search = "";
        if (isMarketingBlockedPath(pathname)) {
          homeUrl.hash = "download";
        }
        return middlewareRedirect(homeUrl, req);
      }
      return middlewareNext(req);
    }

    let res = NextResponse.next({
      request: {
        headers: buildRequestHeaders(req),
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            req.cookies.set({ name, value, ...options });
            res = NextResponse.next({
              request: {
                headers: buildRequestHeaders(req),
              },
            });
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            req.cookies.set({ name, value: "", ...options });
            res = NextResponse.next({
              request: {
                headers: buildRequestHeaders(req),
              },
            });
            res.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const requiresAuth = isProtectedPath(pathname);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session && requiresAuth) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return middlewareRedirect(loginUrl, req);
    }

    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete, account_lifecycle_state, account_purge_at")
        .eq("id", session.user.id)
        .maybeSingle();

      const noProfileOkPaths = new Set<string>([
        ONBOARDING_PATH,
        "/reset-password",
        "/signup",
      ]);
      if (!profile && !noProfileOkPaths.has(pathname)) {
        await supabase.auth.signOut();
        const removedUrl = req.nextUrl.clone();
        removedUrl.pathname = "/login";
        removedUrl.searchParams.set("account", "removed");
        return middlewareRedirect(removedUrl, req);
      }

      const onboardingComplete = !!profile?.onboarding_complete;

      if (AUTH_PAGES.includes(pathname)) {
        const appUrl = req.nextUrl.clone();
        appUrl.pathname = onboardingComplete ? "/hub" : ONBOARDING_PATH;
        appUrl.search = "";
        return middlewareRedirect(appUrl, req);
      }

      /** Allow password recovery page even when onboarding is incomplete (hash tokens are client-only). */
      if (
        !onboardingComplete &&
        pathname !== ONBOARDING_PATH &&
        pathname !== "/reset-password"
      ) {
        const onboardingUrl = req.nextUrl.clone();
        onboardingUrl.pathname = ONBOARDING_PATH;
        onboardingUrl.search = "";
        return middlewareRedirect(onboardingUrl, req);
      }

      if (onboardingComplete && pathname === ONBOARDING_PATH) {
        const appUrl = req.nextUrl.clone();
        appUrl.pathname = "/hub";
        appUrl.search = "";
        return middlewareRedirect(appUrl, req);
      }

      if (onboardingComplete && pathname === "/") {
        const appUrl = req.nextUrl.clone();
        appUrl.pathname = "/hub";
        appUrl.search = "";
        return middlewareRedirect(appUrl, req);
      }
    }

    return applyDevDocumentNoStore(res, req);
  } catch (e) {
    console.error("[middleware]", e);
    if (isMarketingSiteAccessRequired()) {
      const gateUrl = req.nextUrl.clone();
      gateUrl.pathname = "/site-access";
      return middlewareRedirect(gateUrl, req);
    }
    return middlewareNext(req);
  }
}

export const config = {
  matcher: [
    "/sw.js",
    "/api/:path*",
    "/((?!_next|favicon.ico|sw.js|workbox-).*)",
  ],
};

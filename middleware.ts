import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_GATE_PATH_PREFIXES } from "@/lib/authGatePaths";
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];
const ONBOARDING_PATH = "/onboarding";

function isProtectedPath(pathname: string) {
  return AUTH_GATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Stops the browser from keeping a stale HTML shell that points at deleted `/_next/static/*` hashes after `next dev` restarts. */
function withDevDocumentNoStore(res: NextResponse, req: NextRequest) {
  if (process.env.NODE_ENV !== "development") return res;
  const p = req.nextUrl.pathname;
  if (/\.(?:ico|png|jpe?g|gif|webp|svg|json|txt|xml|webmanifest|js|css|map|woff2?)$/i.test(p)) {
    return res;
  }
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}

/** Dev-only: replace production Workbox `sw.js` so browsers never precache stale `/_next/static` hashes. */
const DEV_SW_NULL =
  "self.addEventListener('install',function(e){self.skipWaiting();});" +
  "self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){" +
  "return Promise.all(ks.map(function(k){return caches.delete(k);}));}).then(function(){" +
  "return self.registration.unregister();}).then(function(){" +
  "return self.clients.matchAll({type:'window',includeUncontrolled:true});}).then(function(cs){" +
  "cs.forEach(function(c){try{c.navigate(c.url);}catch(_){}});}));});";

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
      return withDevDocumentNoStore(NextResponse.next(), req);
    }

    let res = NextResponse.next({
      request: {
        headers: req.headers,
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
                headers: req.headers,
              },
            });
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            req.cookies.set({ name, value: "", ...options });
            res = NextResponse.next({
              request: {
                headers: req.headers,
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
      return withDevDocumentNoStore(NextResponse.redirect(loginUrl), req);
    }

    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .maybeSingle();

      const onboardingComplete = !!profile?.onboarding_complete;

      if (AUTH_PAGES.includes(pathname)) {
        const appUrl = req.nextUrl.clone();
        appUrl.pathname = onboardingComplete ? "/hub" : ONBOARDING_PATH;
        appUrl.search = "";
        return withDevDocumentNoStore(NextResponse.redirect(appUrl), req);
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
        return withDevDocumentNoStore(NextResponse.redirect(onboardingUrl), req);
      }

      if (onboardingComplete && pathname === ONBOARDING_PATH) {
        const appUrl = req.nextUrl.clone();
        appUrl.pathname = "/hub";
        appUrl.search = "";
        return withDevDocumentNoStore(NextResponse.redirect(appUrl), req);
      }
    }

    return withDevDocumentNoStore(res, req);
  } catch (e) {
    console.error("[middleware]", e);
    return withDevDocumentNoStore(NextResponse.next(), req);
  }
}

export const config = {
  matcher: [
    "/sw.js",
    "/((?!_next|api|favicon.ico|sw.js|workbox-).*)",
  ],
};

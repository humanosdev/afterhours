import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
const PROTECTED_PREFIXES = ["/hub", "/map", "/chat", "/profile", "/settings", "/onboarding"];
const AUTH_PAGES = ["/login", "/signup"];
const ONBOARDING_PATH = "/onboarding";

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(req: NextRequest) {
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

  const pathname = req.nextUrl.pathname;
  const requiresAuth = isProtectedPath(pathname);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && requiresAuth) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
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
      return NextResponse.redirect(appUrl);
    }

    if (!onboardingComplete && pathname !== ONBOARDING_PATH) {
      const onboardingUrl = req.nextUrl.clone();
      onboardingUrl.pathname = ONBOARDING_PATH;
      onboardingUrl.search = "";
      return NextResponse.redirect(onboardingUrl);
    }

    if (onboardingComplete && pathname === ONBOARDING_PATH) {
      const appUrl = req.nextUrl.clone();
      appUrl.pathname = "/hub";
      appUrl.search = "";
      return NextResponse.redirect(appUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next|api|favicon.ico|sw.js|workbox-).*)",
  ],
};

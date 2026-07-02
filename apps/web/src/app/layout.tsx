import "mapbox-gl/dist/mapbox-gl.css";
import AppShell from "@/components/AppShell";
import { AuthRouteTransitionProvider } from "@/components/AuthRouteTransition";
import { DEV_PURGE_SERVICE_WORKER_SCRIPT } from "@/lib/devPurgeServiceWorkerScript";
import { IntencityBrandLockupImage } from "@/components/IntencityBrandLockupImage";
import { INTENCITY_BRAND_LOCKUP_SRC } from "@/lib/brandAssets";
import { PROD_CHUNK_HEAL_SCRIPT } from "@/lib/prodChunkHealScript";
import { appConfig } from "@/lib/appConfig";
import { isMarketingSite } from "@/lib/webSiteMode";
import "./globals.css";

const marketingSite = isMarketingSite();

export const metadata = {
  title: marketingSite ? `${appConfig.appName} — Live nightlife awareness` : appConfig.appName,
  description: appConfig.description,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Intencity",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    /** iOS “Add to Home Screen” reads `/apple-touch-icon.png` first. */
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  /** Match `globals.css` `--ah-bg-primary` / Tailwind `bg-primary` (#0A0C18, rgb(10,12,24)). */
  themeColor: "#0A0C18",
  width: "device-width",
  initialScale: 1,
  /** Lets `env(safe-area-inset-*)` include the home indicator on notched iPhones. */
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "development" ? (
          <script dangerouslySetInnerHTML={{ __html: DEV_PURGE_SERVICE_WORKER_SCRIPT }} />
        ) : null}
        {process.env.NODE_ENV === "production" ? (
          <script dangerouslySetInnerHTML={{ __html: PROD_CHUNK_HEAL_SCRIPT }} />
        ) : null}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Static favicon from public/ — avoid app/icon.png route (extra webpack chunks that desync in dev). */}
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="preload" href={INTENCITY_BRAND_LOCKUP_SRC} as="image" />
        {process.env.NODE_ENV === "development" ? (
          <>
            <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
            <meta httpEquiv="Pragma" content="no-cache" />
          </>
        ) : null}
      </head>
      <body>
        {/*
          First paint before React hydrates: same logo as InitialAppSplash so the screen is not empty black.
          Removed in InitialAppSplash when the real splash mounts or when this tab already finished splash.
        */}
        <div
          id="ah-static-boot-splash"
          className="pointer-events-none fixed -inset-px z-[249999] flex min-h-[100dvh] w-[calc(100%+2px)] items-center justify-center bg-primary px-4"
          aria-hidden
        >
          {/*
            CSS background (not <img>) avoids intrinsic-size reflow; geometry matches InitialAppSplash.
          */}
          <IntencityBrandLockupImage variant="splash" fetchPriority="high" className="shrink-0" />
        </div>
        <AuthRouteTransitionProvider>
          <AppShell>{children}</AppShell>
        </AuthRouteTransitionProvider>
      </body>
    </html>
  );
}

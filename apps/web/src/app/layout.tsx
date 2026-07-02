import "./globals.css";
import AppShell from "@/components/AppShell";
import { AuthRouteTransitionProvider } from "@/components/AuthRouteTransition";
import { DEV_PURGE_SERVICE_WORKER_SCRIPT } from "@/lib/devPurgeServiceWorkerScript";
import { IntencityBrandLockupImage } from "@/components/IntencityBrandLockupImage";
import { INTENCITY_BRAND_LOCKUP_SRC } from "@/lib/brandAssets";
import { PROD_CHUNK_HEAL_SCRIPT } from "@/lib/prodChunkHealScript";
import { appConfig } from "@/lib/appConfig";
import { isMarketingSite } from "@/lib/webSiteMode";
import { assertMarketingSiteAccess } from "@/lib/marketingAccessGate";

const marketingSite = isMarketingSite();

export const dynamic = marketingSite ? "force-dynamic" : "auto";

export const metadata = {
  title: marketingSite
    ? `${appConfig.appName} — Live nightlife awareness`
    : appConfig.appName,
  description: marketingSite
    ? "Download Intencity for iOS — live venue activity and friends on the map in Philadelphia."
    : appConfig.description,
  ...(marketingSite
    ? {}
    : {
        manifest: "/manifest.json",
        appleWebApp: {
          capable: true,
          statusBarStyle: "black-translucent" as const,
          title: "Intencity",
        },
      }),
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#0A0C18",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (marketingSite) {
    assertMarketingSiteAccess();
    return (
      <html lang="en" className="overflow-x-hidden">
        <head>
          {process.env.NODE_ENV === "production" ? (
            <script dangerouslySetInnerHTML={{ __html: PROD_CHUNK_HEAL_SCRIPT }} />
          ) : null}
          <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
          <link rel="preload" href={INTENCITY_BRAND_LOCKUP_SRC} as="image" />
        </head>
        <body className="overflow-x-hidden bg-primary text-text-primary antialiased">
          <AuthRouteTransitionProvider>{children}</AuthRouteTransitionProvider>
        </body>
      </html>
    );
  }

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
        <div
          id="ah-static-boot-splash"
          className="pointer-events-none fixed -inset-px z-[249999] flex min-h-[100dvh] w-[calc(100%+2px)] items-center justify-center bg-primary px-4"
          aria-hidden
        >
          <IntencityBrandLockupImage variant="splash" fetchPriority="high" className="shrink-0" />
        </div>
        <AuthRouteTransitionProvider>
          <AppShell>{children}</AppShell>
        </AuthRouteTransitionProvider>
      </body>
    </html>
  );
}

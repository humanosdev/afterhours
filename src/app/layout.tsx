import "mapbox-gl/dist/mapbox-gl.css";
import AppShell from "@/components/AppShell";
import { DEV_PURGE_SERVICE_WORKER_SCRIPT } from "@/lib/devPurgeServiceWorkerScript";
import { PROD_CHUNK_HEAL_SCRIPT } from "@/lib/prodChunkHealScript";
import "./globals.css";

export const metadata = {
  title: "Intencity",
  description: "See where the night is happening",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Intencity",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    /** iOS “Add to Home Screen” reads `/apple-touch-icon.png` first. */
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#0E0E12",
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
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="512x512" />
        {process.env.NODE_ENV === "development" ? (
          <>
            <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
            <meta httpEquiv="Pragma" content="no-cache" />
          </>
        ) : null}
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

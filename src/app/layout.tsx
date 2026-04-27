import "mapbox-gl/dist/mapbox-gl.css";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata = {
  title: "AfterHours",
  description: "See where the night is happening",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AfterHours",
  },
  icons: {
    apple: "/icon-512.png",
  },
};

export const viewport = {
  themeColor: "#0E0E12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

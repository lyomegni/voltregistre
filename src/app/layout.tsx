import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VoltRegistre", template: "%s · VoltRegistre" },
  description:
    "Maintenance préventive et conformité réglementaire des installations électriques industrielles.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#17232b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

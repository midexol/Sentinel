import type { Metadata } from "next";
import Providers from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel : Autonomous Nonce Gap Watchdog on Base L2",
  description:
    "Institutional autonomous nonce gap detector and resolver protecting high-frequency market makers and trading agents on Base L2.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Pacifico&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-void text-marble font-sans antialiased min-h-screen selection:bg-aurum/20 selection:text-aurum-light">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

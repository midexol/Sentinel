import type { Metadata } from "next";
import { Cinzel, Fraunces, IBM_Plex_Sans, IBM_Plex_Mono, Pacifico } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const ibmSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const brandScript = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-brand-script",
  display: "swap",
});

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
    <html
      lang="en"
      className={`${cinzel.variable} ${fraunces.variable} ${ibmSans.variable} ${ibmMono.variable} ${brandScript.variable}`}
    >
      <head>
        <link rel="icon" type="image/png" href="/icon.png" />
      </head>
      <body className="bg-void text-marble font-sans antialiased min-h-screen selection:bg-aurum/20 selection:text-aurum-light">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

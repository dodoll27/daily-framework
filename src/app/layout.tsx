import type { Metadata, Viewport } from "next";
import { Caveat, Geist, Instrument_Serif, Space_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const mono = Space_Mono({ variable: "--font-space-mono", subsets: ["latin"], weight: ["400", "700"] });
const hand = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily Framework",
  description: "The plan is the default. Schedule first, time not completion.",
  applicationName: "Daily Framework",
  appleWebApp: { capable: true, title: "Daily", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#efe9dd",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${serif.variable} ${mono.variable} ${hand.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Truth Bounty - Decentralized Claim Verification",
  description: "A decentralized protocol for verifying claims through community consensus and staking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
  <body className={`${geistSans.variable} ${geistMono.variable}`}>
    {/* Skip link for keyboard users */}
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-white text-black px-3 py-2 rounded"
    >
      Skip to content
    </a>

    <Providers>
      {/* Optional: wrap nav inside Providers if it depends on context */}
      <nav aria-label="Main navigation">
        {/* your existing navigation component */}
      </nav>

      <main id="main" tabIndex={-1}>
        {children}
      </main>
    </Providers>
  </body>
</html>
  );
}

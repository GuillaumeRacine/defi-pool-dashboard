import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeFi Dashboard",
  description: "Comprehensive DeFi analytics dashboard with DEX analysis, protocol insights, and liquidity pool data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white min-h-screen`}
      >
        <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-lg font-bold text-white hover:text-blue-400 transition-colors">
              DeFi Dashboard
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/dexs" className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                <span className="text-xs">🔄</span>
                <span>DEX Analysis</span>
              </Link>
              <Link href="/protocols" className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                <span className="text-xs">🏛️</span>
                <span>Protocol Analysis</span>
              </Link>
              <Link href="/pools" className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                <span className="text-xs">🏊</span>
                <span>High TVL Pools</span>
              </Link>
            </div>
          </div>
        </nav>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PortfolioX — Mutual Fund Portfolio Analytics",
  description:
    "Discover hidden overlap, true sector exposure, and exact cost leakages in your Indian mutual fund portfolio — in seconds.",
  keywords: [
    "mutual fund",
    "portfolio analytics",
    "overlap detection",
    "sector exposure",
    "expense audit",
    "Indian mutual funds",
    "fintech",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0f1e] text-slate-200">
        {children}
      </body>
    </html>
  );
}
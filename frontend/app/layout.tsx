import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geist = Geist({
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
  title: "PortfolioX — India's Most Advanced Mutual Fund Intelligence Platform",
  description:
    "Discover hidden overlap, true sector exposure, tax optimization, XIRR, SIP planning, Goal Tracker, AI Co-Pilot, and exact cost leakages in your Indian mutual fund portfolio — in seconds.",
  keywords: [
    "mutual fund", "portfolio analytics", "overlap detection", "sector exposure",
    "expense audit", "Indian mutual funds", "fintech", "XIRR calculator",
    "SIP planner", "tax calculator", "ELSS", "goal planner",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111827',
              border: '1px solid #1e293b',
              color: '#e2e8f0',
            }
          }}
        />
      </body>
    </html>
  );
}
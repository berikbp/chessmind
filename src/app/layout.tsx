import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ChessMind",
    template: "%s | ChessMind",
  },
  description: "A chess platform with an AI coach that explains your mistakes in plain language.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--chess-bg)] font-sans text-[var(--chess-cream)]">
        {children}
      </body>
    </html>
  );
}

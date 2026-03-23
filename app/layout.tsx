import type { Metadata } from "next";
import { Manrope, Work_Sans, Inter } from "next/font/google";
import GlobalNav from "../components/global-nav";
import BottomNav from "../components/bottom-nav";
import SiteFooter from "../components/site-footer";
import { AuthProvider } from "./context/auth";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap"
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-label",
  display: "swap"
});

export const metadata: Metadata = {
  title: "The Informed Lens",
  description: "Curated intelligence for your perspective."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${manrope.variable} ${workSans.variable} ${inter.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
        />
      </head>
      <body>
        <AuthProvider>
          <GlobalNav />
          {children}
          <BottomNav />
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}

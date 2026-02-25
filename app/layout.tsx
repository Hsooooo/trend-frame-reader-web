import type { Metadata } from "next";
import Script from "next/script";
import GlobalNav from "../components/global-nav";
import { AuthProvider } from "./context/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trend Frame Reader",
  description: "Daily feed for Trend Frame Reader"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2057329897151119"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body>
        <AuthProvider>
          <GlobalNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

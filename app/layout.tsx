import type { Metadata } from "next";
import GlobalNav from "../components/global-nav";
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
      <body>
        <GlobalNav />
        {children}
      </body>
    </html>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Feed" },
  { href: "/bookmarks", label: "Bookmarks" },
  { href: "/ask", label: "Q&A" },
  { href: "/insights", label: "Insights" }
];

export default function GlobalNav() {
  const pathname = usePathname();

  return (
    <header className="top-nav-wrap">
      <nav className="top-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={active ? "top-nav-link active" : "top-nav-link"}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "피드", icon: "newspaper" },
  { href: "/bookmarks", label: "저장", icon: "bookmark" },
  { href: "/ask", label: "Q&A", icon: "forum" },
  { href: "/graph", label: "그래프", icon: "hub" },
];

const hiddenPrefixes = ["/about", "/privacy", "/contact", "/posts"];

export default function BottomNav() {
  const pathname = usePathname();

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <nav className="bottom-nav">
      {tabs.map(({ href, label, icon }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link key={href} href={href} className={`bottom-nav-item${isActive ? " active" : ""}`}>
            <span
              className="material-symbols-outlined bottom-nav-icon"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

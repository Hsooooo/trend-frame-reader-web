"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../app/context/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const NAV_ITEMS = [
  { href: "/", label: "Feed" },
  { href: "/bookmarks", label: "Bookmarks" },
  { href: "/ask", label: "Q&A" },
  { href: "/posts", label: "Posts" },
  { href: "/insights", label: "Insights", ownerOnly: true }
];

export default function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header className="top-nav-wrap">
      <nav className="top-nav" aria-label="Main navigation">
        <div className="top-nav-links">
          {NAV_ITEMS.filter((item) => !item.ownerOnly || user?.is_owner).map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "top-nav-link active" : "top-nav-link"}>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="top-nav-auth">
          {!loading && (
            user ? (
              <div className="top-nav-auth-user">
                {user.picture && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="top-nav-auth-avatar"
                  />
                )}
                <span className="top-nav-auth-name" title={user.name}>{user.name}</span>
                <button
                  onClick={() => void handleLogout()}
                  className="top-nav-auth-logout"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <a
                href={`${API_BASE}/auth/google/login`}
                className="top-nav-auth-login"
              >
                Google로 로그인
              </a>
            )
          )}
        </div>
      </nav>
    </header>
  );
}

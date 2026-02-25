"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../app/context/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const NAV_ITEMS = [
  { href: "/", label: "Feed" },
  { href: "/bookmarks", label: "Bookmarks" },
  { href: "/ask", label: "Q&A" },
  { href: "/insights", label: "Insights" }
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
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={active ? "top-nav-link active" : "top-nav-link"}>
              {item.label}
            </Link>
          );
        })}

        <div className="top-nav-auth">
          {!loading && (
            user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {user.picture && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={user.name}
                    style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                  />
                )}
                <span style={{ fontSize: "0.85rem", color: "#374151" }}>{user.name}</span>
                <button
                  onClick={() => void handleLogout()}
                  style={{
                    fontSize: "0.8rem",
                    padding: "4px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    background: "transparent",
                    cursor: "pointer",
                    color: "#6b7280",
                  }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <a
                href={`${API_BASE}/auth/google/login`}
                style={{
                  fontSize: "0.82rem",
                  padding: "5px 12px",
                  border: "1.5px solid #d1d5db",
                  borderRadius: 8,
                  background: "#f9fafb",
                  color: "#374151",
                  textDecoration: "none",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
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

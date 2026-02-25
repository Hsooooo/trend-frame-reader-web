import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span className="site-footer-copy">© {year} Trend Frame</span>
        <nav className="site-footer-links" aria-label="Footer navigation">
          <Link href="/about">소개</Link>
          <Link href="/privacy">개인정보처리방침</Link>
          <Link href="/contact">문의</Link>
        </nav>
      </div>
    </footer>
  );
}

"use client";

import { useEffect, useState } from "react";
import { fetchBookmarks } from "../../lib/api";
import { BookmarkItem } from "../../lib/types";

const PAGE_SIZE = 10;

export default function BookmarksPage() {
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (targetPage: number) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchBookmarks(targetPage, PAGE_SIZE);
      setItems(data.items);
      setPage(data.page);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setTotalPages(0);
      setError(e instanceof Error ? e.message : "bookmarks_load_failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
  }, [page]);

  return (
    <main>
      <h1>Bookmarks</h1>
      <p>저장한 항목 목록입니다.</p>

      <section className="panel">
        <div className="row">
          <strong>북마크</strong>
          <button onClick={() => void load(page)}>새로고침</button>
        </div>

        <div className="pager">
          <button onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1 || loading}>
            이전
          </button>
          <span className="meta">{totalPages > 0 ? `${page} / ${totalPages}` : "0 / 0"} · Total {total}</span>
          <button
            onClick={() => setPage((prev) => Math.min(totalPages || 1, prev + 1))}
            disabled={page >= totalPages || totalPages === 0 || loading}
          >
            다음
          </button>
        </div>

        {loading && <p className="meta">불러오는 중...</p>}
        {error && <p className="error">{error}</p>}

        {items.map((item) => (
          <article className="item" key={item.item_id}>
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.title}
            </a>
            <div className="meta">
              {item.source}
              {item.saved_at ? ` · Saved ${new Date(item.saved_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}` : ""}
            </div>
          </article>
        ))}
        {!loading && !items.length && <p className="meta">아직 저장한 항목이 없습니다.</p>}
      </section>
    </main>
  );
}

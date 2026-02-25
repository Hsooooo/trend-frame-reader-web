"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchInsightPosts } from "../../lib/api";
import { InsightPost } from "../../lib/types";

export default function PostsPage() {
  const [posts, setPosts] = useState<InsightPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchInsightPosts(20, 0);
        setPosts(data.posts);
        setTotal(data.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "posts_load_failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main>
      <h1>Weekly Insights</h1>
      <p>Trend Frame 주간 트렌드 분석 포스트</p>

      {loading && <p className="meta" style={{ marginTop: 20 }}>불러오는 중...</p>}
      {error && <p className="error" style={{ marginTop: 20 }}>{error}</p>}

      {!loading && !error && posts.length === 0 && (
        <p className="meta" style={{ marginTop: 20 }}>아직 발행된 포스트가 없습니다.</p>
      )}

      <div className="posts-grid">
        {posts.map((post) => (
          <Link key={post.slug} href={`/posts/${post.slug}`} className="post-card">
            <div className="post-card-period">
              {post.period_start} ~ {post.period_end}
            </div>
            <h2 className="post-card-title">{post.title}</h2>
            {post.summary && <p className="post-card-summary">{post.summary}</p>}
            {post.published_at && (
              <div className="post-card-date">
                {new Date(post.published_at).toLocaleDateString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </div>
            )}
          </Link>
        ))}
      </div>

      {!loading && total > 20 && (
        <p className="meta" style={{ marginTop: 16, textAlign: "center" }}>
          총 {total}개 포스트
        </p>
      )}
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createInsightDraft,
  fetchAdminInsightPosts,
  fetchKeywordSentiments,
  fetchUserStats,
  patchInsightPost,
  publishInsightPost,
  unpublishInsightPost
} from "../../lib/api";
import {
  InsightPostAdmin,
  KeywordSentimentItem,
  KeywordSentimentsResponse,
  SentimentLabel,
  UserStatItem,
  UserStatsResponse
} from "../../lib/types";
import { useAuth } from "../context/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SENTIMENT_LABEL: Record<string, string> = {
  very_positive: "Very Positive",
  positive: "Positive",
  mixed: "Mixed",
  neutral: "Neutral",
  negative: "Negative",
  very_negative: "Very Negative"
};

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 14);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function prettyLabel(label: string): string {
  return SENTIMENT_LABEL[label] ?? label;
}

function sentimentClass(label: string): string {
  const safe = label as SentimentLabel;
  if (safe === "very_positive") return "tone-very-positive";
  if (safe === "positive") return "tone-positive";
  if (safe === "mixed") return "tone-mixed";
  if (safe === "neutral") return "tone-neutral";
  if (safe === "negative") return "tone-negative";
  if (safe === "very_negative") return "tone-very-negative";
  return "tone-neutral";
}

// ── Keyword Sentiments tab ────────────────────────────────────────────────────

function KeywordSentimentsTab() {
  const initial = initialDateRange();
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [result, setResult] = useState<KeywordSentimentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (from: string, to: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchKeywordSentiments({ dateFrom: from, dateTo: to, minFeedback: 2, limit: 100 });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "keyword_sentiments_load_failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void load(dateFrom, dateTo);
  };

  useEffect(() => { void load(dateFrom, dateTo); }, []);

  return (
    <section className="panel">
      <form className="insights-filter" onSubmit={onSubmit}>
        <label>
          From
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <button type="submit" className="primary" disabled={loading}>조회</button>
      </form>

      {loading && <p className="meta">불러오는 중...</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <>
          <div className="row insights-summary">
            <span className="meta">기간: {result.date_from} ~ {result.date_to}</span>
            <span className="meta">Total keywords: {result.total_keywords}</span>
          </div>
          <div className="insights-table-wrap">
            <table className="insights-table">
              <thead>
                <tr>
                  <th>Keyword</th><th>Sentiment</th><th>Liked</th>
                  <th>Disliked</th><th>Total Items</th><th>Score</th>
                </tr>
              </thead>
              <tbody>
                {result.keywords.map((item: KeywordSentimentItem) => (
                  <tr key={item.keyword}>
                    <td>{item.keyword}</td>
                    <td><span className={`badge ${sentimentClass(item.sentiment_label)}`}>{prettyLabel(item.sentiment_label)}</span></td>
                    <td>{item.liked_count}</td>
                    <td>{item.disliked_count}</td>
                    <td>{item.total_items}</td>
                    <td>{item.sentiment_score.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!result.keywords.length && <p className="meta">조건에 맞는 키워드가 없습니다.</p>}
        </>
      )}
    </section>
  );
}

// ── Posts Admin tab ───────────────────────────────────────────────────────────

type EditState = { title: string; summary: string; body: string };

function PostsAdminTab() {
  const [posts, setPosts] = useState<InsightPostAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftDays, setDraftDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<EditState>({ title: "", summary: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminInsightPosts();
      setPosts(data.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "posts_load_failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPosts(); }, []);

  const handleCreateDraft = async () => {
    setCreating(true);
    setActionError("");
    try {
      const post = await createInsightDraft(draftDays);
      setPosts((prev) => [post, ...prev]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "draft_create_failed");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (post: InsightPostAdmin) => {
    setEditingId(post.id);
    setEditFields({ title: post.title, summary: post.summary ?? "", body: post.body ?? "" });
    setActionError("");
  };

  const cancelEdit = () => { setEditingId(null); setActionError(""); };

  const handleSave = async (id: number) => {
    setSaving(true);
    setActionError("");
    try {
      const updated = await patchInsightPost(id, {
        title: editFields.title || undefined,
        summary: editFields.summary || undefined,
        body: editFields.body || undefined
      });
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingId(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: number) => {
    setActionError("");
    try {
      const updated = await publishInsightPost(id);
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "publish_failed");
    }
  };

  const handleUnpublish = async (id: number) => {
    setActionError("");
    try {
      const updated = await unpublishInsightPost(id);
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "unpublish_failed");
    }
  };

  const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "—";

  return (
    <section className="panel">
      <div className="admin-posts-toolbar">
        <select value={draftDays} onChange={(e) => setDraftDays(Number(e.target.value))}>
          <option value={7}>7일</option>
          <option value={14}>14일</option>
          <option value={30}>30일</option>
        </select>
        <button className="primary" onClick={() => void handleCreateDraft()} disabled={creating}>
          {creating ? "생성 중..." : "+ 새 초안 생성"}
        </button>
        <button onClick={() => void loadPosts()} disabled={loading}>새로고침</button>
      </div>

      {actionError && <p className="error" style={{ marginBottom: 8 }}>{actionError}</p>}
      {loading && <p className="meta">불러오는 중...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && posts.length === 0 && <p className="meta">포스트가 없습니다.</p>}

      {posts.map((post) => (
        <div key={post.id} className="admin-post-row">
          <div className="admin-post-meta">
            <span className={`badge ${post.status === "published" ? "saved" : "tone-neutral"}`}>
              {post.status === "published" ? "발행됨" : "초안"}
            </span>
            <span className="admin-post-title">{post.title}</span>
            <span className="meta">{post.period_start} ~ {post.period_end}</span>
          </div>
          <div className="meta">
            생성: {fmtDate(post.created_at)}
            {post.published_at ? ` · 발행: ${fmtDate(post.published_at)}` : ""}
          </div>

          {editingId === post.id ? (
            <div className="draft-editor">
              <input
                type="text"
                placeholder="제목"
                value={editFields.title}
                onChange={(e) => setEditFields((f) => ({ ...f, title: e.target.value }))}
              />
              <input
                type="text"
                placeholder="요약"
                value={editFields.summary}
                onChange={(e) => setEditFields((f) => ({ ...f, summary: e.target.value }))}
              />
              <textarea
                placeholder="본문 (마크다운)"
                value={editFields.body}
                onChange={(e) => setEditFields((f) => ({ ...f, body: e.target.value }))}
              />
              <div className="draft-editor-actions">
                <button className="primary" onClick={() => void handleSave(post.id)} disabled={saving}>
                  {saving ? "저장 중..." : "저장"}
                </button>
                <button onClick={cancelEdit}>취소</button>
              </div>
            </div>
          ) : (
            <div className="admin-post-actions">
              <button className="soft" onClick={() => startEdit(post)}>편집</button>
              {post.status === "draft" ? (
                <button className="primary" onClick={() => void handlePublish(post.id)}>발행</button>
              ) : (
                <button className="warn" onClick={() => void handleUnpublish(post.id)}>발행 취소</button>
              )}
              {post.status === "published" && (
                <a
                  href={`/posts/${post.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "0.86rem", alignSelf: "center" }}
                >
                  보기 ↗
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

// ── User Stats tab ────────────────────────────────────────────────────────────

function initialUserDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function UserStatsTab() {
  const initial = initialUserDateRange();
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [result, setResult] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (from: string, to: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchUserStats({ dateFrom: from, dateTo: to });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "user_stats_load_failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void load(dateFrom, dateTo);
  };

  useEffect(() => { void load(dateFrom, dateTo); }, []);

  return (
    <section className="panel">
      <form className="insights-filter" onSubmit={onSubmit}>
        <label>
          From
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <button type="submit" className="primary" disabled={loading}>조회</button>
      </form>

      {loading && <p className="meta">불러오는 중...</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <>
          <div className="row insights-summary">
            <span className="meta">기간: {result.date_from} ~ {result.date_to}</span>
            <span className="meta">사용자 수: {result.users.length}</span>
          </div>
          <div className="insights-table-wrap">
            <table className="insights-table">
              <thead>
                <tr>
                  <th>사용자</th>
                  <th>가입일</th>
                  <th>노출</th>
                  <th>클릭</th>
                  <th>CTR</th>
                  <th>저장</th>
                  <th>좋아요</th>
                  <th>싫어요</th>
                  <th>스킵</th>
                </tr>
              </thead>
              <tbody>
                {result.users.map((u: UserStatItem) => (
                  <tr key={u.user_id}>
                    <td>
                      <div>{u.name}{u.is_owner && <span className="badge saved" style={{ marginLeft: 4 }}>owner</span>}</div>
                      <div className="meta" style={{ fontSize: "0.8rem" }}>{u.email}</div>
                    </td>
                    <td>{new Date(u.joined_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</td>
                    <td>{u.impressions}</td>
                    <td>{u.clicks}</td>
                    <td>{(u.ctr * 100).toFixed(1)}%</td>
                    <td>{u.saved}</td>
                    <td>{u.liked}</td>
                    <td>{u.disliked}</td>
                    <td>{u.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!result.users.length && <p className="meta">사용자 데이터가 없습니다.</p>}
        </>
      )}
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "keywords" | "posts" | "users";

export default function InsightsPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("keywords");

  if (!authLoading && !user) {
    return (
      <main>
        <h1>Insights</h1>
        <section className="panel">
          <p className="meta">
            Insights를 보려면{" "}
            <a href={`${API_BASE}/auth/google/login`} style={{ color: "#0f766e" }}>
              Google로 로그인
            </a>
            하세요.
          </p>
        </section>
      </main>
    );
  }

  if (authLoading) {
    return <main><h1>Insights</h1><p className="meta">로드 중...</p></main>;
  }

  return (
    <main>
      <h1>Insights</h1>
      <p>운영자 전용 인사이트 대시보드</p>

      <div className="tab-bar">
        <button
          className={`tab-btn${tab === "keywords" ? " active" : ""}`}
          onClick={() => setTab("keywords")}
        >
          키워드 감성
        </button>
        <button
          className={`tab-btn${tab === "posts" ? " active" : ""}`}
          onClick={() => setTab("posts")}
        >
          포스트 관리
        </button>
        {user?.is_owner && (
          <button
            className={`tab-btn${tab === "users" ? " active" : ""}`}
            onClick={() => setTab("users")}
          >
            사용자 현황
          </button>
        )}
      </div>

      {tab === "keywords" && <KeywordSentimentsTab />}
      {tab === "posts" && <PostsAdminTab />}
      {tab === "users" && user?.is_owner && <UserStatsTab />}
    </main>
  );
}

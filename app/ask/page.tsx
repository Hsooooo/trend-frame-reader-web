"use client";

import { useRef, useState } from "react";
import { askBookmarks } from "../../lib/api";
import { AskHistoryEntry, AskResult } from "../../lib/types";
import { useAuth } from "../context/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const SUGGESTED = [
  "최근 AI 관련 뉴스 요약해줘",
  "보안 이슈 중 주목할 만한 것은?",
  "클라우드 인프라 트렌드는?",
  "한국 경제 최근 동향은?"
];

const MAX_HISTORY = 5;

function AnswerBlock({ query, result }: { query: string; result: AskResult }) {
  return (
    <div style={{ marginTop: 20 }}>
      {/* Query bubble */}
      <div
        style={{
          background: "#f2f4f7",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: "0.92rem",
          color: "#344054",
          marginBottom: 12
        }}
      >
        <span style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>질문</span>
        {query}
      </div>

      {/* Answer panel */}
      <div className="panel" style={{ marginTop: 0 }}>
        <div style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600, marginBottom: 8, letterSpacing: "0.01em" }}>
          답변
        </div>
        <p
          style={{ color: "var(--text)", fontSize: "0.95rem", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}
          dangerouslySetInnerHTML={{
            __html: result.answer.replace(/\n/g, "<br />")
          }}
        />

        {/* Sources */}
        <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            출처
          </div>
          {result.sources.length === 0 ? (
            <p className="meta">관련 북마크를 찾지 못했습니다.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.sources.map((src) => {
                const pct = Math.round(src.similarity * 100);
                return (
                  <div
                    key={src.item_id}
                    style={{
                      background: "#f9fafb",
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      padding: "10px 12px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: "0.88rem",
                          color: "#175cd3",
                          fontWeight: 500,
                          lineHeight: 1.45,
                          flex: 1
                        }}
                      >
                        {src.title}
                      </a>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: "var(--accent)",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          background: "var(--accent-weak)",
                          borderRadius: 6,
                          padding: "2px 7px"
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                    {/* Similarity bar */}
                    <div
                      style={{
                        marginTop: 8,
                        height: 4,
                        background: "#e4e7ec",
                        borderRadius: 99,
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: "var(--accent)",
                          borderRadius: 99,
                          transition: "width 0.6s ease"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AskPage() {
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AskHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  const submit = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setResult(null);
    setLastQuery(trimmed);

    try {
      const data = await askBookmarks(trimmed);
      setResult(data);

      // save to history (most recent first, cap at MAX_HISTORY)
      setHistory((prev) => {
        const entry: AskHistoryEntry = { query: trimmed, result: data };
        return [entry, ...prev].slice(0, MAX_HISTORY);
      });

      // scroll answer into view after paint
      requestAnimationFrame(() => {
        answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "ask_failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit(query);
    }
  };

  const handleSuggest = (q: string) => {
    setQuery(q);
  };

  if (!authLoading && !user) {
    return (
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "16px" }}>
        <h1>북마크 Q&amp;A</h1>
        <section className="panel">
          <p className="meta">
            Q&A를 사용하려면{" "}
            <a href={`${API_BASE}/auth/google/login`} style={{ color: "#0f766e" }}>
              Google로 로그인
            </a>
            하세요.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>북마크 Q&amp;A</h1>
        <a
          href="/"
          style={{
            fontSize: "0.82rem",
            color: "var(--muted)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 12px",
            border: "1.5px solid var(--line)",
            borderRadius: 10,
            background: "#fff",
            fontWeight: 500,
            whiteSpace: "nowrap",
            flexShrink: 0
          }}
        >
          ← 홈
        </a>
      </div>
      <p style={{ marginBottom: 16 }}>저장한 북마크 기반으로 질문에 답합니다.</p>

      {/* Suggested chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {SUGGESTED.map((s) => (
          <button
            key={s}
            onClick={() => handleSuggest(s)}
            style={{
              fontSize: "0.82rem",
              padding: "6px 12px",
              borderRadius: 999,
              border: "1.5px solid #99f6e4",
              background: "var(--accent-weak)",
              color: "var(--accent)",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="panel" style={{ marginTop: 0 }}>
        <textarea
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="질문을 입력하세요. (Enter로 전송, Shift+Enter는 줄바꿈)"
          disabled={loading}
          style={{
            width: "100%",
            resize: "vertical",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: "0.95rem",
            color: "var(--text)",
            background: loading ? "#f9fafb" : "#fff",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.6,
            transition: "border-color 0.15s",
            boxSizing: "border-box"
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--line)"; }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 8, gap: 10 }}>
          {loading && (
            <span className="meta" style={{ fontSize: "0.86rem" }}>
              답변 생성 중...
            </span>
          )}
          <button
            className="primary"
            disabled={loading || !query.trim()}
            onClick={() => void submit(query)}
            style={{ minWidth: 90 }}
          >
            {loading ? "생성 중..." : "질문하기"}
          </button>
        </div>
      </div>

      {error && (
        <p className="error" style={{ marginTop: 12 }}>
          오류: {error}
        </p>
      )}

      {/* Current answer */}
      <div ref={answerRef}>
        {result && <AnswerBlock query={lastQuery} result={result} />}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            style={{
              fontSize: "0.84rem",
              color: "var(--muted)",
              background: "none",
              border: "none",
              padding: "4px 0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>{historyOpen ? "▲" : "▼"}</span>
            이전 질문 ({history.length}개)
          </button>

          {historyOpen && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 16 }}>
              {history.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    opacity: 0.75,
                    borderLeft: "3px solid var(--line)",
                    paddingLeft: 12
                  }}
                >
                  <AnswerBlock query={entry.query} result={entry.result} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
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
      <div className="ask-query-bubble">
        <span className="ask-query-label">질문</span>
        {query}
      </div>

      {/* Answer panel */}
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="ask-answer-label">
          답변
        </div>
        <div className="ask-answer-body markdown-body">
          <ReactMarkdown>{result.answer}</ReactMarkdown>
        </div>

        {/* Sources */}
        <div className="ask-sources-wrap">
          <div className="ask-sources-label">
            출처
          </div>
          {result.sources.length === 0 ? (
            <p className="meta">관련 북마크를 찾지 못했습니다.</p>
          ) : (
            <div className="ask-sources-list">
              {result.sources.map((src) => {
                const pct = Math.round(src.similarity * 100);
                return (
                  <div
                    key={src.item_id}
                    className="ask-source-card"
                  >
                    <div className="ask-source-header">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ask-source-link"
                      >
                        {src.title}
                      </a>
                      <span className="ask-similarity-pct">
                        {pct}%
                      </span>
                    </div>
                    {/* Similarity bar */}
                    <div className="ask-similarity-bar">
                      <div
                        className="ask-similarity-fill"
                        style={{ width: `${pct}%` }}
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
      <main className="ask-page">
        <h1>북마크 Q&amp;A</h1>
        <section className="panel">
          <p className="meta">
            Q&A를 사용하려면{" "}
            <a href={`${API_BASE}/auth/google/login`}>
              Google로 로그인
            </a>
            하세요.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="ask-page">
      {/* Header */}
      <div className="page-header">
        <h1>북마크 Q&amp;A</h1>
        <a href="/" className="ask-back-btn">
          ← 홈
        </a>
      </div>
      <p style={{ marginBottom: 16 }}>저장한 북마크 기반으로 질문에 답합니다.</p>

      {/* Suggested chips */}
      <div className="ask-chips">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            onClick={() => handleSuggest(s)}
            className="ask-chip"
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
          className="ask-textarea"
        />
        <div className="ask-submit-row">
          {loading && (
            <span className="meta">
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
            className="ask-history-toggle"
          >
            <span>{historyOpen ? "▲" : "▼"}</span>
            이전 질문 ({history.length}개)
          </button>

          {historyOpen && (
            <div className="ask-history-list">
              {history.map((entry, i) => (
                <div
                  key={i}
                  className="ask-history-entry"
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

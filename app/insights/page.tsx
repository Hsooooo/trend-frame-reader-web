"use client";

import { FormEvent, useEffect, useState } from "react";
import { fetchKeywordSentiments } from "../../lib/api";
import { KeywordSentimentItem, KeywordSentimentsResponse, SentimentLabel } from "../../lib/types";
import { useAuth } from "../context/auth";

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function InsightsPage() {
  const { user, loading: authLoading } = useAuth();
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
      const data = await fetchKeywordSentiments({
        dateFrom: from,
        dateTo: to,
        minFeedback: 2,
        limit: 100
      });
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

  useEffect(() => {
    if (!authLoading && user) {
      void load(dateFrom, dateTo);
    }
  }, [authLoading, user]);

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

  return (
    <main>
      <h1>Insights</h1>
      <p>키워드 감성 점수(liked/disliked 기반)</p>

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
          <button type="submit" className="primary" disabled={loading}>
            조회
          </button>
        </form>

        {loading && <p className="meta">불러오는 중...</p>}
        {error && <p className="error">{error}</p>}

        {result && (
          <>
            <div className="row insights-summary">
              <span className="meta">
                기간: {result.date_from} ~ {result.date_to}
              </span>
              <span className="meta">Total keywords: {result.total_keywords}</span>
            </div>

            <div className="insights-table-wrap">
              <table className="insights-table">
                <thead>
                  <tr>
                    <th>Keyword</th>
                    <th>Sentiment</th>
                    <th>Liked</th>
                    <th>Disliked</th>
                    <th>Total Items</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {result.keywords.map((item: KeywordSentimentItem) => (
                    <tr key={item.keyword}>
                      <td>{item.keyword}</td>
                      <td>
                        <span className={`badge ${sentimentClass(item.sentiment_label)}`}>
                          {prettyLabel(item.sentiment_label)}
                        </span>
                      </td>
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
    </main>
  );
}

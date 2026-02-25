"use client";

import { useCallback, useEffect, useState } from "react";
import TabBar, { type Tab } from "./components/tab-bar";
import GraphView from "./components/graph-view";
import TimelineView from "./components/timeline-view";
import { fetchFullGraph, fetchTimeline } from "@/lib/api";
import type { FullGraphResponse, TimelineResponse } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type KeywordCloudItem = {
  keyword: string;
  frequency: number;
  sentiment_score: number;
};

type KeywordCloudResponse = {
  total: number;
  keywords: KeywordCloudItem[];
};

export default function GraphPage() {
  const [activeTab, setActiveTab] = useState<Tab>("graph");

  // Keyword cloud
  const [cloud, setCloud] = useState<KeywordCloudItem[]>([]);
  const [activeKeyword, setActiveKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Graph tab state
  const [graphData, setGraphData] = useState<FullGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  // Timeline tab state
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [error, setError] = useState("");

  // ── Load graph ──────────────────────────────────────────────────────────────

  const loadGraph = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return;
    setGraphLoading(true);
    setError("");
    try {
      const data = await fetchFullGraph(keyword.trim());
      setGraphData(data);
      setActiveKeyword(keyword.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "graph_load_failed");
    } finally {
      setGraphLoading(false);
    }
  }, []);

  // ── Load timeline ───────────────────────────────────────────────────────────

  const loadTimeline = useCallback(async () => {
    setTimelineLoading(true);
    setError("");
    try {
      const data = await fetchTimeline(30);
      setTimelineData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "timeline_load_failed");
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  // ── Initial load: keyword cloud ─────────────────────────────────────────────

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/bookmarks/keywords?limit=30`, { cache: "no-store" });
        if (!res.ok) throw new Error(`keywords_error_${res.status}`);
        const data: KeywordCloudResponse = await res.json();
        setCloud(data.keywords);
        if (data.keywords.length > 0) {
          await loadGraph(data.keywords[0].keyword);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "keyword_load_failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tab change handler ──────────────────────────────────────────────────────

  const handleTabChange = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      setError("");
      if (tab === "timeline" && !timelineData) {
        void loadTimeline();
      }
    },
    [timelineData, loadTimeline]
  );

  // ── Search handler ──────────────────────────────────────────────────────────

  const handleSearch = () => {
    if (searchInput.trim()) {
      void loadGraph(searchInput.trim());
      setSearchInput("");
      if (activeTab !== "graph") setActiveTab("graph");
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleKeywordClick = useCallback(
    (keyword: string) => {
      void loadGraph(keyword);
    },
    [loadGraph]
  );

  const loading = activeTab === "graph" ? graphLoading : timelineLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>키워드 그래프</h1>
        <a
          href="/"
          style={{
            fontSize: "0.875rem",
            color: "#475467",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 12px",
            border: "1px solid #d0d5dd",
            borderRadius: 10,
            background: "#fff",
          }}
        >
          ← 피드로 돌아가기
        </a>
      </div>
      <p style={{ margin: "0 0 16px", color: "#475467" }}>
        북마크에서 추출한 키워드와 기사의 연결 관계를 탐색합니다. 키워드 노드를 클릭하면 그래프가 재구성되고, 기사 노드를 클릭하면 원문을 엽니다.
      </p>

      {/* Keyword cloud */}
      {cloud.length > 0 && (
        <section className="panel" style={{ marginBottom: 0 }}>
          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: "0.9rem", color: "#344054" }}>인기 키워드</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cloud.map((item) => {
              const isActive = item.keyword === activeKeyword;
              return (
                <button
                  key={item.keyword}
                  onClick={() => {
                    void loadGraph(item.keyword);
                    if (activeTab !== "graph") setActiveTab("graph");
                  }}
                  style={{
                    borderRadius: "999px",
                    padding: "4px 12px",
                    fontSize: "0.82rem",
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    border: isActive ? "1.5px solid #0f766e" : "1px solid #d0d5dd",
                    background: isActive ? "#ccfbf1" : "#fff",
                    color: isActive ? "#0f766e" : "#475467",
                    transition: "background 0.15s, border-color 0.15s, color 0.15s",
                    lineHeight: "1.4",
                  }}
                >
                  {item.keyword}
                  <span style={{ marginLeft: 5, fontSize: "0.75rem", opacity: 0.65 }}>
                    {item.frequency}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Search */}
      <section className="panel" style={{ marginTop: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="키워드 직접 탐색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={{
              flex: 1,
              border: "1px solid #d0d5dd",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: "0.92rem",
              color: "#101828",
              background: "#fff",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button className="primary" onClick={handleSearch} disabled={!searchInput.trim() || loading}>
            탐색
          </button>
        </div>
      </section>

      {/* Tab bar */}
      <div style={{ marginTop: 10 }}>
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Content area */}
      <section className="panel" style={{ marginTop: 0, padding: "14px 14px 20px", borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "none" }}>
        {/* Status bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#344054" }}>
            {activeTab === "graph" && activeKeyword ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    background: "#ccfbf1",
                    color: "#0f766e",
                    border: "1px solid #5eead4",
                    borderRadius: "999px",
                    padding: "2px 10px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    marginRight: 6,
                  }}
                >
                  {activeKeyword}
                </span>
                {graphData && (
                  <span style={{ fontSize: "0.82rem", color: "#475467", fontWeight: 400 }}>
                    키워드 {graphData.keyword_nodes.length}개 · 기사 {graphData.article_nodes.length}개
                  </span>
                )}
              </>
            ) : activeTab === "timeline" ? (
              <span style={{ color: "#475467", fontWeight: 400 }}>
                최근 30일 저장 기사{timelineData ? ` · ${timelineData.articles.length}건` : ""}
              </span>
            ) : (
              <span style={{ color: "#475467", fontWeight: 400 }}>키워드를 선택하거나 검색하세요</span>
            )}
          </div>
          {loading && (
            <span style={{ fontSize: "0.82rem", color: "#475467" }}>불러오는 중...</span>
          )}
        </div>

        {error && (
          <p style={{ color: "#b42318", fontSize: "0.88rem", margin: "0 0 10px" }}>{error}</p>
        )}

        {/* Graph view */}
        {activeTab === "graph" && (
          <>
            {graphData ? (
              <GraphView data={graphData} onKeywordClick={handleKeywordClick} />
            ) : (
              !graphLoading && !error && (
                <div
                  style={{
                    width: "100%",
                    height: 540,
                    background: "#f8fafc",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontSize: "0.9rem",
                  }}
                >
                  그래프가 여기에 표시됩니다
                </div>
              )
            )}
            {graphData && (
              <p style={{ margin: "10px 0 0", fontSize: "0.78rem", color: "#94a3b8", textAlign: "center" }}>
                노드를 드래그하거나 클릭해서 탐색하세요
              </p>
            )}
          </>
        )}

        {/* Timeline view */}
        {activeTab === "timeline" && (
          <>
            {timelineData ? (
              <TimelineView data={timelineData} />
            ) : (
              !timelineLoading && !error && (
                <div
                  style={{
                    width: "100%",
                    height: 340,
                    background: "#f8fafc",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontSize: "0.9rem",
                  }}
                >
                  타임라인을 불러오는 중...
                </div>
              )
            )}
            {timelineData && (
              <p style={{ margin: "10px 0 0", fontSize: "0.78rem", color: "#94a3b8", textAlign: "center" }}>
                기사를 클릭하면 원문을 엽니다
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

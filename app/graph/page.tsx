"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import TabBar, { type Tab } from "./components/tab-bar";
import GraphView from "./components/graph-view";
import SimilarityGraphView from "./components/similarity-graph-view";
import MarketGraphView from "./components/market-graph-view";
import TimelineView from "./components/timeline-view";
import {
  backfillMarketGraph,
  fetchFullGraph,
  fetchMarketTickerGraph,
  fetchSimilarityGraph,
  fetchTimeline,
} from "../../lib/api";
import type {
  FullGraphResponse,
  MarketGraphBackfillResponse,
  MarketTickerGraphResponse,
  SimilarityGraphResponse,
  TimelineResponse,
} from "../../lib/types";
import { useAuth } from "../context/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const MARKET_QUICK_TICKERS = ["AAPL", "NVDA", "MSFT", "AMZN", "META", "AMD", "TSLA", "GOOGL"];

type KeywordCloudItem = {
  keyword: string;
  frequency: number;
  sentiment_score: number;
};

type KeywordCloudResponse = {
  total: number;
  keywords: KeywordCloudItem[];
};

function toDisplayError(message: string, scope: "graph" | "timeline" | "market"): string {
  if (message.includes("not_owner")) {
    return "관리자 권한이 필요합니다";
  }
  if (message.includes("ticker_required")) {
    return "미국 주식 티커를 입력하세요";
  }
  if (scope === "market" && message.includes("ticker_not_found")) {
    return "해당 티커에 연결된 북마크 기사 그래프를 찾지 못했습니다";
  }
  if (scope === "market" && message.includes("market_backfill_error")) {
    return "시장 그래프 전체 백필 실행에 실패했습니다";
  }
  if (scope === "graph" && message.includes("keyword_not_found")) {
    return "해당 키워드 그래프를 찾지 못했습니다";
  }
  if (scope === "timeline" && message.includes("timeline_error")) {
    return "타임라인을 불러오지 못했습니다";
  }
  return message;
}

export default function GraphPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("graph");

  // Keyword cloud
  const [cloud, setCloud] = useState<KeywordCloudItem[]>([]);
  const [activeKeyword, setActiveKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Graph tab state
  const [graphData, setGraphData] = useState<FullGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  // Similarity tab state
  const [simGraphData, setSimGraphData] = useState<SimilarityGraphResponse | null>(null);
  const [simGraphLoading, setSimGraphLoading] = useState(false);

  // Timeline tab state
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Market tab state
  const [marketInput, setMarketInput] = useState("");
  const [marketData, setMarketData] = useState<MarketTickerGraphResponse | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketBackfillRunning, setMarketBackfillRunning] = useState(false);
  const [marketBackfillResult, setMarketBackfillResult] = useState<MarketGraphBackfillResponse | null>(null);
  const [marketBackfillError, setMarketBackfillError] = useState("");

  const [error, setError] = useState("");

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);
  }, []);

  // ── Load graph ──────────────────────────────────────────────────────────────

  const loadGraph = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return;
    setGraphLoading(true);
    setError("");
    try {
      const graphOptions = isMobile
        ? { maxKeywordNodes: 15, maxArticlesPerKeyword: 2 }
        : { maxKeywordNodes: 30 };
      const data = await fetchFullGraph(keyword.trim(), 1, graphOptions);
      setGraphData(data);
      setActiveKeyword(keyword.trim());
    } catch (e) {
      setError(toDisplayError(e instanceof Error ? e.message : "graph_load_failed", "graph"));
    } finally {
      setGraphLoading(false);
    }
  }, [isMobile]);

  // ── Load similarity graph ───────────────────────────────────────────────────

  const loadSimilarityGraph = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return;
    setSimGraphLoading(true);
    setError("");
    try {
      const simOptions = isMobile ? { limit: 10, maxArticlesPerKeyword: 2 } : { limit: 15 };
      const data = await fetchSimilarityGraph(keyword.trim(), simOptions);
      setSimGraphData(data);
      setActiveKeyword(keyword.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "similarity_graph_load_failed");
    } finally {
      setSimGraphLoading(false);
    }
  }, [isMobile]);

  // ── Load timeline ───────────────────────────────────────────────────────────

  const loadTimeline = useCallback(async () => {
    setTimelineLoading(true);
    setError("");
    try {
      const data = await fetchTimeline(30);
      setTimelineData(data);
    } catch (e) {
      setError(toDisplayError(e instanceof Error ? e.message : "timeline_load_failed", "timeline"));
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  // ── Load market graph ───────────────────────────────────────────────────────

  const loadMarketGraph = useCallback(async (ticker: string) => {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;

    setMarketInput(symbol);
    setMarketData(null);
    setMarketLoading(true);
    setError("");
    try {
      const data = await fetchMarketTickerGraph({
        ticker: symbol,
        days: 30,
        maxArticles: 20,
        bookmarksOnly: true,
      });
      setMarketData(data);
    } catch (e) {
      setError(toDisplayError(e instanceof Error ? e.message : "market_graph_load_failed", "market"));
    } finally {
      setMarketLoading(false);
    }
  }, []);

  // ── Initial load: keyword cloud ─────────────────────────────────────────────

  useEffect(() => {
    if (authLoading || !user) return;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/bookmarks/keywords?limit=30`, { cache: "no-store", credentials: "include" });
        if (!res.ok) throw new Error(`keywords_error_${res.status}`);
        const data: KeywordCloudResponse = await res.json();
        setCloud(data.keywords);
        if (data.keywords.length > 0) {
          await loadGraph(data.keywords[0].keyword);
        }
      } catch (e) {
        setError(toDisplayError(e instanceof Error ? e.message : "keyword_load_failed", "graph"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // ── Tab change handler ──────────────────────────────────────────────────────

  const handleTabChange = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      setError("");
      if (tab === "timeline" && !timelineData) {
        void loadTimeline();
      }
      if (tab === "similarity" && !simGraphData && activeKeyword) {
        void loadSimilarityGraph(activeKeyword);
      }
    },
    [timelineData, loadTimeline, simGraphData, loadSimilarityGraph, activeKeyword]
  );

  // ── Search handler ──────────────────────────────────────────────────────────

  const handleSearch = () => {
    if (activeTab === "market") {
      if (marketInput.trim()) {
        void loadMarketGraph(marketInput);
      }
      return;
    }

    if (searchInput.trim()) {
      if (activeTab === "similarity") {
        void loadSimilarityGraph(searchInput.trim());
      } else {
        void loadGraph(searchInput.trim());
        setActiveTab("graph");
      }
      setSearchInput("");
    }
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleKeywordClick = useCallback(
    (keyword: string) => {
      if (activeTab === "similarity") {
        void loadSimilarityGraph(keyword);
      } else {
        void loadGraph(keyword);
      }
    },
    [activeTab, loadGraph, loadSimilarityGraph]
  );

  const handleMarketTickerClick = useCallback(
    (ticker: string) => {
      setActiveTab("market");
      setMarketInput(ticker);
      void loadMarketGraph(ticker);
    },
    [loadMarketGraph]
  );

  const handleMarketBackfill = useCallback(async () => {
    setMarketBackfillRunning(true);
    setMarketBackfillError("");
    setMarketBackfillResult(null);
    try {
      const result = await backfillMarketGraph(0);
      setMarketBackfillResult(result);

      const reloadTicker = marketData?.focus_ticker ?? marketInput.trim();
      if (reloadTicker) {
        await loadMarketGraph(reloadTicker);
      }
    } catch (e) {
      setMarketBackfillError(
        toDisplayError(e instanceof Error ? e.message : "market_backfill_error", "market")
      );
    } finally {
      setMarketBackfillRunning(false);
    }
  }, [loadMarketGraph, marketData, marketInput]);

  const loading =
    activeTab === "graph"
      ? graphLoading
      : activeTab === "similarity"
      ? simGraphLoading
      : activeTab === "timeline"
      ? timelineLoading
      : marketLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!authLoading && !user) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
        <h1>북마크 그래프</h1>
        <section className="panel">
          <p className="meta">
            그래프를 보려면{" "}
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
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>북마크 그래프</h1>
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
        북마크를 기준으로 키워드 관계, 저장 시점 타임라인, 티커 기반 시장 엔티티 그래프를 함께 탐색합니다.
      </p>

      {/* Keyword cloud */}
      {(activeTab === "graph" || activeTab === "similarity") && cloud.length > 0 && (
        <section className="panel" style={{ marginBottom: 0 }}>
          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: "0.9rem", color: "#344054" }}>인기 키워드</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cloud.map((item) => {
              const isActive = item.keyword === activeKeyword;
              return (
                <button
                  key={item.keyword}
                  onClick={() => {
                    if (activeTab === "similarity") {
                      void loadSimilarityGraph(item.keyword);
                    } else {
                      void loadGraph(item.keyword);
                      if (activeTab !== "graph") setActiveTab("graph");
                    }
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
      {activeTab !== "timeline" && (
        <section className="panel" style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder={activeTab === "market" ? "미국 주식 티커 입력... (예: AAPL, NVDA)" : "키워드 직접 탐색..."}
              value={activeTab === "market" ? marketInput : searchInput}
              onChange={(e) => {
                if (activeTab === "market") {
                  setMarketInput(e.target.value.toUpperCase());
                } else {
                  setSearchInput(e.target.value);
                }
              }}
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
            <button
              className="primary"
              onClick={handleSearch}
              disabled={activeTab === "market" ? !marketInput.trim() || loading : !searchInput.trim() || loading}
            >
              {activeTab === "market" ? "티커 보기" : "탐색"}
            </button>
          </div>

          {activeTab === "market" && (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ fontSize: "0.8rem", color: "#667085" }}>
                현재 market graph는 북마크로 저장한 기사만 기준으로 구성됩니다.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {MARKET_QUICK_TICKERS.map((ticker) => {
                  const isActive = marketData?.focus_ticker === ticker;
                  return (
                    <button
                      key={ticker}
                      onClick={() => {
                        setMarketInput(ticker);
                        void loadMarketGraph(ticker);
                      }}
                      style={{
                        borderRadius: "999px",
                        padding: "4px 12px",
                        fontSize: "0.82rem",
                        fontWeight: isActive ? 700 : 500,
                        cursor: "pointer",
                        border: isActive ? "1.5px solid #0f766e" : "1px solid #d0d5dd",
                        background: isActive ? "#ccfbf1" : "#fff",
                        color: isActive ? "#0f766e" : "#475467",
                        lineHeight: "1.4",
                      }}
                    >
                      {ticker}
                    </button>
                  );
                })}
              </div>

              {user?.is_owner && (
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px dashed #99f6e4",
                    background: "#f0fdfa",
                    padding: "12px 14px",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#115e59" }}>관리자 도구</div>
                      <div style={{ marginTop: 3, fontSize: "0.8rem", color: "#0f766e" }}>
                        전체 기사 코퍼스를 `market_articles` projection으로 다시 동기화합니다.
                      </div>
                    </div>
                    <button
                      className="primary"
                      onClick={() => void handleMarketBackfill()}
                      disabled={marketBackfillRunning}
                    >
                      {marketBackfillRunning ? "백필 실행 중..." : "전체 기사 백필"}
                    </button>
                  </div>

                  {marketBackfillError && (
                    <div style={{ fontSize: "0.82rem", color: "#b42318" }}>{marketBackfillError}</div>
                  )}

                  {marketBackfillResult && (
                    <div style={{ fontSize: "0.82rem", color: "#0f766e" }}>
                      processed {marketBackfillResult.processed} · synced {marketBackfillResult.synced} · failed{" "}
                      {marketBackfillResult.failed} · status {marketBackfillResult.status}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Tab bar */}
      <div style={{ marginTop: 10 }}>
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Content area */}
      <section className="panel" style={{ marginTop: 0, padding: "14px 14px 20px", borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "none" }}>
        {/* Status bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#344054" }}>
            {(activeTab === "graph" || activeTab === "similarity") && activeKeyword ? (
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
                {activeTab === "graph" && graphData && (
                  <span style={{ fontSize: "0.82rem", color: "#475467", fontWeight: 400 }}>
                    키워드 {graphData.keyword_nodes.length}개 · 기사 {graphData.article_nodes.length}개
                  </span>
                )}
                {activeTab === "similarity" && simGraphData && (
                  <span style={{ fontSize: "0.82rem", color: "#475467", fontWeight: 400 }}>
                    키워드 {simGraphData.keyword_nodes.length}개 · 기사 {simGraphData.article_nodes.length}개
                  </span>
                )}
              </>
            ) : activeTab === "market" && marketData ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    background: "#ecfeff",
                    color: "#0f766e",
                    border: "1px solid #99f6e4",
                    borderRadius: "999px",
                    padding: "2px 10px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    marginRight: 6,
                  }}
                >
                  {marketData.focus_ticker}
                </span>
                <span style={{ fontSize: "0.82rem", color: "#475467", fontWeight: 400 }}>
                  기사 {marketData.article_nodes.length}건 · 기업 {marketData.company_nodes.length}개 · 이벤트 {marketData.event_nodes.length}개
                </span>
              </>
            ) : activeTab === "timeline" ? (
              <span style={{ color: "#475467", fontWeight: 400 }}>
                최근 30일 저장 기사{timelineData ? ` · ${timelineData.articles.length}건` : ""}
              </span>
            ) : (
              <span style={{ color: "#475467", fontWeight: 400 }}>
                {activeTab === "market" ? "티커를 입력해 시장 엔티티 그래프를 불러오세요" : "키워드를 선택하거나 검색하세요"}
              </span>
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
              <GraphView data={graphData} onKeywordClick={handleKeywordClick} isMobile={isMobile} />
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
            {graphData && isMobile && (
              <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "#94a3b8", textAlign: "center" }}>
                모바일 최적화 모드 · 상위 15개 키워드
              </p>
            )}
          </>
        )}

        {/* Similarity graph view */}
        {activeTab === "similarity" && (
          <>
            {simGraphData ? (
              <SimilarityGraphView data={simGraphData} onKeywordClick={handleKeywordClick} isMobile={isMobile} />
            ) : (
              !simGraphLoading && !error && (
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
                  키워드를 선택하거나 검색하세요
                </div>
              )
            )}
            {simGraphData && (
              <p style={{ margin: "10px 0 0", fontSize: "0.78rem", color: "#94a3b8", textAlign: "center" }}>
                노드를 드래그하거나 클릭해서 탐색하세요 · 선 굵기는 의미적 유사도를 나타냅니다
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

        {/* Market view */}
        {activeTab === "market" && (
          <>
            {marketData ? (
              <MarketGraphView data={marketData} onTickerClick={handleMarketTickerClick} />
            ) : (
              !marketLoading && !error && (
                <div
                  style={{
                    width: "100%",
                    minHeight: 340,
                    background: "#f8fafc",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontSize: "0.9rem",
                    padding: "24px 20px",
                    textAlign: "center",
                  }}
                >
                  저장한 기사에 연결된 미국 티커를 입력하면 기사·기업·이벤트·테마 관계를 보여줍니다
                </div>
              )
            )}
            {marketData && (
              <p style={{ margin: "10px 0 0", fontSize: "0.78rem", color: "#94a3b8", textAlign: "center" }}>
                기사 안의 티커 배지를 누르면 해당 종목으로 그래프를 다시 불러옵니다
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

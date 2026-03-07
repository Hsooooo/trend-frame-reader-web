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
  fetchMarketBackfillJob,
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
  if (message.includes("market_backfill_job_not_found")) {
    return "시장 그래프 백필 작업을 찾지 못했습니다";
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
  const [marketBackfillJob, setMarketBackfillJob] = useState<MarketGraphBackfillResponse | null>(null);
  const [marketBackfillError, setMarketBackfillError] = useState("");

  const [error, setError] = useState("");

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);
  }, []);

  useEffect(() => {
    if (authLoading || !user?.is_owner) return;
    void (async () => {
      try {
        const job = await fetchMarketBackfillJob();
        setMarketBackfillJob(job);
      } catch (e) {
        const message = e instanceof Error ? e.message : "market_backfill_status_error";
        if (!message.includes("market_backfill_job_not_found")) {
          setMarketBackfillError(toDisplayError(message, "market"));
        }
      }
    })();
  }, [authLoading, user]);

  useEffect(() => {
    if (!user?.is_owner || !marketBackfillJob) return;
    if (!["queued", "running", "paused"].includes(marketBackfillJob.status)) return;

    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const next = await fetchMarketBackfillJob(marketBackfillJob.job_id);
          setMarketBackfillJob(next);
        } catch (e) {
          setMarketBackfillError(
            toDisplayError(
              e instanceof Error ? e.message : "market_backfill_status_error",
              "market"
            )
          );
        }
      })();
    }, 2000);

    return () => window.clearInterval(timer);
  }, [marketBackfillJob, user]);

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
    setMarketBackfillError("");
    try {
      const job = await backfillMarketGraph(0);
      setMarketBackfillJob(job);
    } catch (e) {
      setMarketBackfillError(
        toDisplayError(e instanceof Error ? e.message : "market_backfill_error", "market")
      );
    }
  }, []);

  const loading =
    activeTab === "graph"
      ? graphLoading
      : activeTab === "similarity"
      ? simGraphLoading
      : activeTab === "timeline"
      ? timelineLoading
      : marketLoading;

  const marketBackfillActive = marketBackfillJob
    ? ["queued", "running", "paused"].includes(marketBackfillJob.status)
    : false;
  const marketBackfillPct = marketBackfillJob?.total
    ? Math.min(100, Math.round((marketBackfillJob.processed / marketBackfillJob.total) * 100))
    : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!authLoading && !user) {
    return (
      <main className="graph-page">
        <h1>북마크 그래프</h1>
        <section className="panel">
          <p className="meta">
            그래프를 보려면{" "}
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
    <main className="graph-page">
      {/* Header */}
      <div className="page-header">
        <h1>북마크 그래프</h1>
        <a href="/" className="back-btn">
          ← 피드로 돌아가기
        </a>
      </div>
      <p className="meta" style={{ marginBottom: 16 }}>
        북마크를 기준으로 키워드 관계, 저장 시점 타임라인, 티커 기반 시장 엔티티 그래프를 함께 탐색합니다.
      </p>

      {/* Keyword cloud */}
      {(activeTab === "graph" || activeTab === "similarity") && cloud.length > 0 && (
        <section className="panel" style={{ marginBottom: 0 }}>
          <div className="keyword-cloud-title">인기 키워드</div>
          <div className="keyword-cloud">
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
                  className={`keyword-chip${isActive ? " active" : ""}`}
                >
                  {item.keyword}
                  <span className="keyword-chip-freq">
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
          <div className="graph-search-row">
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
              className="graph-search-input"
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
              <div className="market-note">
                현재 market graph는 북마크로 저장한 기사만 기준으로 구성됩니다.
              </div>
              <div className="keyword-cloud">
                {MARKET_QUICK_TICKERS.map((ticker) => {
                  const isActive = marketData?.focus_ticker === ticker;
                  return (
                    <button
                      key={ticker}
                      onClick={() => {
                        setMarketInput(ticker);
                        void loadMarketGraph(ticker);
                      }}
                      className={`keyword-chip${isActive ? " active" : ""}`}
                    >
                      {ticker}
                    </button>
                  );
                })}
              </div>

              {user?.is_owner && (
                <div className="admin-tool-box">
                  <div className="admin-tool-header">
                    <div>
                      <div className="admin-tool-title">관리자 도구</div>
                      <div className="admin-tool-desc">
                        전체 기사 코퍼스를 `market_articles` projection으로 다시 동기화합니다.
                      </div>
                    </div>
                    <button
                      className="primary"
                      onClick={() => void handleMarketBackfill()}
                      disabled={marketBackfillActive}
                    >
                      {marketBackfillJob?.status === "paused"
                        ? "백필 재개 대기 중..."
                        : marketBackfillActive
                        ? "백필 실행 중..."
                        : "전체 기사 백필"}
                    </button>
                  </div>

                  {marketBackfillError && (
                    <div className="admin-tool-error">{marketBackfillError}</div>
                  )}

                  {marketBackfillJob && (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div className="progress-bar-track">
                        <div
                          className={`progress-bar-fill${marketBackfillJob.status === "paused" ? " progress-bar-fill--paused" : ""}`}
                          style={{ width: `${marketBackfillPct}%` }}
                        />
                      </div>
                      <div className="progress-info">
                        job #{marketBackfillJob.job_id} · {marketBackfillJob.status} · {marketBackfillJob.processed}/
                        {marketBackfillJob.total} ({marketBackfillPct}%)
                      </div>
                      <div className="progress-detail">
                        synced {marketBackfillJob.synced} · failed {marketBackfillJob.failed}
                        {typeof marketBackfillJob.last_item_id === "number"
                          ? ` · last_item_id ${marketBackfillJob.last_item_id}`
                          : ""}
                      </div>
                      {marketBackfillJob.paused_until && (
                        <div className="progress-warning">
                          paused until{" "}
                          {new Date(marketBackfillJob.paused_until).toLocaleString("ko-KR", {
                            timeZone: "Asia/Seoul",
                          })}
                        </div>
                      )}
                      {marketBackfillJob.error_message && (
                        <div className="progress-note">
                          {marketBackfillJob.error_message}
                        </div>
                      )}
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
        <div className="graph-status-bar">
          <div className="graph-status-label">
            {(activeTab === "graph" || activeTab === "similarity") && activeKeyword ? (
              <>
                <span className="status-keyword-pill">
                  {activeKeyword}
                </span>
                {activeTab === "graph" && graphData && (
                  <span className="status-info">
                    키워드 {graphData.keyword_nodes.length}개 · 기사 {graphData.article_nodes.length}개
                  </span>
                )}
                {activeTab === "similarity" && simGraphData && (
                  <span className="status-info">
                    키워드 {simGraphData.keyword_nodes.length}개 · 기사 {simGraphData.article_nodes.length}개
                  </span>
                )}
              </>
            ) : activeTab === "market" && marketData ? (
              <>
                <span className="status-market-pill">
                  {marketData.focus_ticker}
                </span>
                <span className="status-info">
                  기사 {marketData.article_nodes.length}건 · 기업 {marketData.company_nodes.length}개 · 이벤트 {marketData.event_nodes.length}개
                </span>
              </>
            ) : activeTab === "timeline" ? (
              <span className="status-info">
                최근 30일 저장 기사{timelineData ? ` · ${timelineData.articles.length}건` : ""}
              </span>
            ) : (
              <span className="status-info">
                {activeTab === "market" ? "티커를 입력해 시장 엔티티 그래프를 불러오세요" : "키워드를 선택하거나 검색하세요"}
              </span>
            )}
          </div>
          {loading && (
            <span className="graph-loading-text">불러오는 중...</span>
          )}
        </div>

        {error && (
          <p className="graph-error">{error}</p>
        )}

        {/* Graph view */}
        {activeTab === "graph" && (
          <>
            {graphData ? (
              <GraphView data={graphData} onKeywordClick={handleKeywordClick} isMobile={isMobile} />
            ) : (
              !graphLoading && !error && (
                <div className="graph-placeholder">
                  그래프가 여기에 표시됩니다
                </div>
              )
            )}
            {graphData && (
              <p className="graph-hint">
                노드를 드래그하거나 클릭해서 탐색하세요
              </p>
            )}
            {graphData && isMobile && (
              <p className="graph-hint">
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
                <div className="graph-placeholder">
                  키워드를 선택하거나 검색하세요
                </div>
              )
            )}
            {simGraphData && (
              <p className="graph-hint">
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
                <div className="graph-placeholder graph-placeholder--short">
                  타임라인을 불러오는 중...
                </div>
              )
            )}
            {timelineData && (
              <p className="graph-hint">
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
                <div className="graph-placeholder graph-placeholder--short" style={{ padding: "24px 20px", textAlign: "center" }}>
                  저장한 기사에 연결된 미국 티커를 입력하면 기사·기업·이벤트·테마 관계를 보여줍니다
                </div>
              )
            )}
            {marketData && (
              <p className="graph-hint">
                기사 안의 티커 배지를 누르면 해당 종목으로 그래프를 다시 불러옵니다
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

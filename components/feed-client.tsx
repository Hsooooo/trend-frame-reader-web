"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import FeedItemCard from "../components/feed-item-card";
import { fetchStockFeed, fetchTodayFeed, sendClickEvent, sendFeedback } from "../lib/api";
import { currentPeriodLabel } from "../lib/slot";
import { FeedGroup, FeedItem, FeedbackAction } from "../lib/types";
import { useAuth } from "../app/context/auth";

type FeedTab = "curated" | "stocks";
type BaseFeedState = { generated_at: string | null; groups: FeedGroup[] };
type CuratedFeedState = BaseFeedState | null;
type StockFeedState = (BaseFeedState & {
  page: number;
  size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}) | null;

const STOCK_PAGE_SIZE = 20;

function categoryLabel(key: string): string {
  const map: Record<string, string> = {
    ai: "AI",
    devtools: "DevTools",
    "infra-cloud": "Infra/Cloud",
    security: "Security",
    "world-politics": "World Politics",
    "world-economy": "World Economy",
    "us-stock-news": "US Stock News",
    "us-stock-filings": "US Stock Filings",
    "stock-feed": "US Stock Feed",
    "korea-politics": "Korea Politics",
    "korea-society": "Korea Society",
    "korea-economy": "Korea Economy",
    "korea-markets": "Korea Markets",
    "korea-tech": "Korea Tech",
    general: "General"
  };
  return map[key] ?? key;
}

function isCurationAction(action: FeedbackAction): action is "saved" | "skipped" {
  return action === "saved" || action === "skipped";
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function FeedClient({
  initialCuratedFeed,
  initialStockFeed,
}: {
  initialCuratedFeed: CuratedFeedState;
  initialStockFeed: StockFeedState;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("curated");
  const [feeds, setFeeds] = useState<{ curated: CuratedFeedState; stocks: StockFeedState }>({
    curated: initialCuratedFeed ?? null,
    stocks: initialStockFeed ?? null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});

  const activeFeed = feeds[activeTab];

  const generatedLabel = useMemo(() => {
    if (!activeFeed?.generated_at) return "-";
    return new Date(activeFeed.generated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  }, [activeFeed?.generated_at]);

  const loadFeed = async (tab: FeedTab, page = 1) => {
    setLoading(true);
    setError("");
    try {
      if (tab === "curated") {
        const data = await fetchTodayFeed();
        const groups =
          data.groups && data.groups.length > 0
            ? data.groups
            : data.items && data.items.length > 0
              ? [{ category: "general", items: data.items }]
              : [];
        setFeeds((prev) => ({
          ...prev,
          curated: {
            generated_at: data.generated_at ?? null,
            groups,
          },
        }));
      } else {
        const data = await fetchStockFeed(page, STOCK_PAGE_SIZE);
        const groups =
          data.groups && data.groups.length > 0
            ? data.groups
            : data.items && data.items.length > 0
              ? [{ category: "stock-feed", items: data.items }]
              : [];
        setFeeds((prev) => ({
          ...prev,
          stocks: {
            generated_at: data.generated_at ?? null,
            groups,
            page: data.page,
            size: data.size,
            total: data.total,
            total_pages: data.total_pages,
            has_next: data.has_next,
            has_prev: data.has_prev,
          },
        }));
      }
    } catch (e) {
      setFeeds((prev) => ({ ...prev, [tab]: null }));
      const code = e instanceof Error ? e.message : "feed_load_failed";
      if (tab === "curated" && code.includes("feed_error_404")) {
        setError("피드가 아직 생성되지 않았습니다.");
      } else {
        setError(code);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadActiveFeed = async () => {
    const stockPage = feeds.stocks?.page ?? 1;
    await loadFeed(activeTab, activeTab === "stocks" ? stockPage : 1);
  };

  const handleFeedback = async (item: FeedItem, action: FeedbackAction) => {
    if (!user) {
      window.location.href = `${API_BASE}/auth/google/login?redirect_to=${encodeURIComponent(window.location.href)}`;
      return;
    }

    const group = isCurationAction(action) ? "curation" : "preference";
    const pendingKey = `${item.item_id}:${group}`;

    const curationAction = item.curation_action ?? (item.saved ? "saved" : item.skipped ? "skipped" : null);
    const preferenceAction = item.preference_action ?? (item.liked ? "liked" : item.disliked ? "disliked" : null);
    if ((group === "curation" && curationAction) || (group === "preference" && preferenceAction) || pendingMap[pendingKey]) {
      return;
    }

    setPendingMap((prev) => ({ ...prev, [pendingKey]: true }));
    try {
      await sendFeedback(item.item_id, action);
      const stockPage = feeds.stocks?.page ?? 1;
      await loadFeed(activeTab, activeTab === "stocks" ? stockPage : 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "feedback_error");
    } finally {
      setPendingMap((prev) => ({ ...prev, [pendingKey]: false }));
    }
  };

  useEffect(() => {
    if (!feeds.curated) {
      void loadFeed("curated");
    }
  }, []);

  useEffect(() => {
    if (!feeds[activeTab]) {
      const stockPage = feeds.stocks?.page ?? 1;
      void loadFeed(activeTab, activeTab === "stocks" ? stockPage : 1);
    }
  }, [activeTab, feeds]);

  const loadStockPage = async (targetPage: number) => {
    await loadFeed("stocks", targetPage);
  };

  const panelTitle = activeTab === "curated" ? "오늘 피드" : "주식 뉴스 피드";
  const panelSubTitle = activeTab === "curated" ? currentPeriodLabel() : "최신순";

  return (
    <>
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2057329897151119"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
    <main>
      <div className="feed-header">
        <h1>Trend Frame Reader</h1>
        <div className="feed-header-actions">
          <a href="/ask" className="feed-shortcut">
            Q&amp;A →
          </a>
          <a href="/graph" className="feed-shortcut">
            그래프 보기 →
          </a>
        </div>
      </div>
      <p>{panelSubTitle} · 업데이트: {generatedLabel}</p>

      <section className="panel">
        <div className="tab-bar" style={{ marginBottom: 12 }}>
          <button
            className={`tab-btn${activeTab === "curated" ? " active" : ""}`}
            onClick={() => setActiveTab("curated")}
          >
            추천 피드
          </button>
          <button
            className={`tab-btn${activeTab === "stocks" ? " active" : ""}`}
            onClick={() => setActiveTab("stocks")}
          >
            주식 뉴스
          </button>
        </div>

        <div className="row">
          <strong>{panelTitle}</strong>
          <div className="controls">
            <button onClick={() => void loadActiveFeed()}>새로고침</button>
          </div>
        </div>

        {loading && <p className="meta">불러오는 중...</p>}
        {error && <p className="error">{error}</p>}

        {activeTab === "stocks" && (
          <>
            <p className="meta" style={{ marginTop: 8 }}>
              Alpaca News, ReleaseWire, SEC RSS, EDGAR RSS 기반 최신 기사 순으로 노출됩니다. Alpaca News 링크는 피드에서 차단되며, 저장하거나 건너뛰어도 목록에서 제외하지 않습니다.
            </p>
            <div className="pager">
              <button
                onClick={() => void loadStockPage(Math.max(1, (feeds.stocks?.page ?? 1) - 1))}
                disabled={loading || !feeds.stocks?.has_prev}
              >
                이전
              </button>
              <span className="meta">
                {feeds.stocks && feeds.stocks.total_pages > 0
                  ? `${feeds.stocks.page} / ${feeds.stocks.total_pages} · Total ${feeds.stocks.total}`
                  : "0 / 0 · Total 0"}
              </span>
              <button
                onClick={() => void loadStockPage((feeds.stocks?.page ?? 1) + 1)}
                disabled={loading || !feeds.stocks?.has_next}
              >
                다음
              </button>
            </div>
          </>
        )}

        {activeFeed?.groups.map((group) => (
          <section key={group.category} className="group">
            {group.category !== "stock-feed" && <h3 className="group-title">{categoryLabel(group.category)}</h3>}
            {group.items.map((item) => (
              <FeedItemCard
                key={item.item_id}
                item={item}
                curationPending={Boolean(pendingMap[`${item.item_id}:curation`])}
                preferencePending={Boolean(pendingMap[`${item.item_id}:preference`])}
                onFeedback={handleFeedback}
                onClickItem={sendClickEvent}
              />
            ))}
          </section>
        ))}

        {!loading && !(activeFeed?.groups.length ?? 0) && <p className="meta">표시할 피드가 없습니다.</p>}
      </section>
    </main>
    </>
  );
}

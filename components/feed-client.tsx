"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import FeedItemCard from "../components/feed-item-card";
import { fetchStockFeed, fetchTodayFeed, sendClickEvent, sendFeedback } from "../lib/api";
import { currentPeriodLabel } from "../lib/slot";
import { FeedGroup, FeedItem, FeedbackAction } from "../lib/types";
import { useAuth } from "../app/context/auth";

type FeedTab = "curated" | "stocks";
type FeedState = { generated_at: string | null; groups: FeedGroup[] } | null;

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
  initialCuratedFeed: FeedState;
  initialStockFeed: FeedState;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("curated");
  const [feeds, setFeeds] = useState<Record<FeedTab, FeedState>>({
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

  const loadFeed = async (tab: FeedTab) => {
    setLoading(true);
    setError("");
    try {
      const data = tab === "curated" ? await fetchTodayFeed() : await fetchStockFeed();
      const fallbackCategory = tab === "curated" ? "general" : "stock-feed";
      const groups =
        data.groups && data.groups.length > 0
          ? data.groups
          : data.items && data.items.length > 0
            ? [{ category: fallbackCategory, items: data.items }]
            : [];
      setFeeds((prev) => ({
        ...prev,
        [tab]: {
          generated_at: data.generated_at ?? null,
          groups,
        },
      }));
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
    await loadFeed(activeTab);
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
      await loadFeed(activeTab);
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
      void loadFeed(activeTab);
    }
  }, [activeTab, feeds]);

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1>Trend Frame Reader</h1>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <a
            href="/ask"
            style={{
              fontSize: "0.82rem",
              color: "#0f766e",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              border: "1.5px solid #5eead4",
              borderRadius: 10,
              background: "#ccfbf1",
              fontWeight: 500,
              whiteSpace: "nowrap"
            }}
          >
            Q&amp;A →
          </a>
          <a
            href="/graph"
            style={{
              fontSize: "0.82rem",
              color: "#0f766e",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              border: "1.5px solid #5eead4",
              borderRadius: 10,
              background: "#ccfbf1",
              fontWeight: 500,
              whiteSpace: "nowrap"
            }}
          >
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
          <p className="meta" style={{ marginTop: 8 }}>
            Alpaca News, SEC RSS, EDGAR RSS 기반 최신 기사 순으로 노출됩니다. 저장하거나 건너뛰어도 목록에서 제외하지 않습니다.
          </p>
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

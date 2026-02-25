"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import FeedItemCard from "../components/feed-item-card";
import { fetchTodayFeed, sendClickEvent, sendFeedback } from "../lib/api";
import { defaultSlotByKstNow, isSlotOpen } from "../lib/slot";
import { FeedGroup, FeedItem, FeedbackAction, Slot } from "../lib/types";
import { useAuth } from "./context/auth";

function categoryLabel(key: string): string {
  const map: Record<string, string> = {
    ai: "AI",
    devtools: "DevTools",
    "infra-cloud": "Infra/Cloud",
    security: "Security",
    "world-politics": "World Politics",
    "world-economy": "World Economy",
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

export default function HomePage() {
  const { user } = useAuth();
  const [slot, setSlot] = useState<Slot>(defaultSlotByKstNow());
  const [feed, setFeed] = useState<{ generated_at: string; groups: FeedGroup[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});
  const amOpen = isSlotOpen("am");
  const pmOpen = isSlotOpen("pm");

  const generatedLabel = useMemo(() => {
    if (!feed?.generated_at) return "-";
    return new Date(feed.generated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  }, [feed?.generated_at]);

  const loadFeed = async (targetSlot: Slot) => {
    if (!isSlotOpen(targetSlot)) {
      setFeed(null);
      setError(targetSlot === "pm" ? "PM 피드는 KST 21:30 이후 열립니다." : "AM 피드는 KST 07:30 이후 열립니다.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await fetchTodayFeed(targetSlot);
      const groups =
        data.groups && data.groups.length > 0
          ? data.groups
          : data.items && data.items.length > 0
            ? [{ category: "general", items: data.items }]
            : [];
      setFeed({ generated_at: data.generated_at, groups });
    } catch (e) {
      setFeed(null);
      const code = e instanceof Error ? e.message : "feed_load_failed";
      if (code.includes("feed_error_404")) {
        setError("해당 슬롯 피드가 아직 생성되지 않았습니다.");
      } else {
        setError(code);
      }
    } finally {
      setLoading(false);
    }
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
      await loadFeed(slot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "feedback_error");
    } finally {
      setPendingMap((prev) => ({ ...prev, [pendingKey]: false }));
    }
  };

  useEffect(() => {
    void loadFeed(slot);
  }, [slot]);

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
      <p>Daily feed · Slot {slot.toUpperCase()} · Generated {generatedLabel}</p>

      <section className="panel">
        <div className="row">
          <strong>오늘 피드</strong>
          <div className="controls">
            <button disabled={!amOpen} className={slot === "am" ? "soft" : ""} onClick={() => setSlot("am")}>
              AM
            </button>
            <button disabled={!pmOpen} className={slot === "pm" ? "soft" : ""} onClick={() => setSlot("pm")}>
              PM
            </button>
            <button onClick={() => void loadFeed(slot)}>새로고침</button>
          </div>
        </div>

        {loading && <p className="meta">불러오는 중...</p>}
        {error && <p className="error">{error}</p>}

        {feed?.groups.map((group) => (
          <section key={group.category} className="group">
            <h3 className="group-title">{categoryLabel(group.category)}</h3>
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

        {!loading && !(feed?.groups.length ?? 0) && <p className="meta">표시할 피드가 없습니다.</p>}
      </section>
    </main>
    </>
  );
}

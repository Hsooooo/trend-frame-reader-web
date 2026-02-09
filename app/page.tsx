"use client";

import { useEffect, useMemo, useState } from "react";

type Slot = "am" | "pm";

type FeedItem = {
  item_id: number;
  title: string;
  source: string;
  category: string;
  url: string;
  short_reason: string;
  rank: number;
  saved: boolean;
};

type FeedGroup = {
  category: string;
  items: FeedItem[];
};

type FeedResponse = {
  feed_date: string;
  slot: Slot;
  generated_at: string;
  items: FeedItem[];
  groups?: FeedGroup[];
};

type BookmarkResponse = {
  items: Array<{
    item_id: number;
    title: string;
    url: string;
    source: string;
    saved: boolean;
  }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function kstNowParts(): { hour: number; minute: number } {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return { hour: now.getHours(), minute: now.getMinutes() };
}

function isSlotOpen(slot: Slot): boolean {
  const { hour, minute } = kstNowParts();
  if (slot === "am") {
    return hour > 7 || (hour === 7 && minute >= 30);
  }
  return hour > 21 || (hour === 21 && minute >= 30);
}

function defaultSlotByKstNow(): Slot {
  return isSlotOpen("pm") ? "pm" : "am";
}

function categoryLabel(key: string): string {
  const map: Record<string, string> = {
    tech: "Tech",
    world: "World",
    business: "Business",
    science: "Science",
    korea: "Korea",
    "korea-business": "Korea Business",
    general: "General"
  };
  return map[key] ?? key;
}

export default function HomePage() {
  const [slot, setSlot] = useState<Slot>(defaultSlotByKstNow());
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkResponse["items"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const amOpen = isSlotOpen("am");
  const pmOpen = isSlotOpen("pm");

  const generatedLabel = useMemo(() => {
    if (!feed?.generated_at) return "-";
    return new Date(feed.generated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  }, [feed?.generated_at]);
  const groups = useMemo<FeedGroup[]>(() => {
    if (!feed) return [];
    if (feed.groups && feed.groups.length > 0) return feed.groups;
    if (feed.items && feed.items.length > 0) return [{ category: "general", items: feed.items }];
    return [];
  }, [feed]);

  const loadFeed = async (targetSlot: Slot) => {
    if (!isSlotOpen(targetSlot)) {
      setFeed(null);
      setError(targetSlot === "pm" ? "PM 피드는 KST 21:30 이후 열립니다." : "AM 피드는 KST 07:30 이후 열립니다.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/feeds/today?slot=${targetSlot}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) {
          setFeed(null);
          setError("해당 슬롯 피드가 아직 생성되지 않았습니다.");
          return;
        }
        throw new Error(`feed_error_${res.status}`);
      }
      const data: FeedResponse = await res.json();
      setFeed(data);
    } catch (e) {
      setFeed(null);
      setError(e instanceof Error ? e.message : "feed_load_failed");
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      const res = await fetch(`${API_BASE}/bookmarks`, { cache: "no-store" });
      if (!res.ok) return;
      const data: BookmarkResponse = await res.json();
      setBookmarks(data.items);
    } catch {
      setBookmarks([]);
    }
  };

  const sendFeedback = async (itemId: number, action: "saved" | "skipped") => {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, action })
    });
    if (!res.ok) {
      setError(`feedback_error_${res.status}`);
      return;
    }
    await Promise.all([loadFeed(slot), loadBookmarks()]);
  };

  useEffect(() => {
    void Promise.all([loadFeed(slot), loadBookmarks()]);
  }, [slot]);

  return (
    <main>
      <h1>Trend Frame Reader</h1>
      <p>Daily feed · Slot {slot.toUpperCase()} · Generated {generatedLabel}</p>

      <section className="panel">
        <div className="row">
          <strong>오늘 피드</strong>
          <div className="controls">
            <button disabled={!amOpen} className={slot === "am" ? "soft" : ""} onClick={() => setSlot("am")}>AM</button>
            <button disabled={!pmOpen} className={slot === "pm" ? "soft" : ""} onClick={() => setSlot("pm")}>PM</button>
            <button onClick={() => void loadFeed(slot)}>새로고침</button>
          </div>
        </div>

        {loading && <p className="meta">불러오는 중...</p>}
        {error && <p className="error">{error}</p>}

        {groups.map((group) => (
          <section key={group.category} className="group">
            <h3 className="group-title">{categoryLabel(group.category)}</h3>
            {group.items.map((item) => (
              <article className="item" key={item.item_id}>
                <div className="row">
                  <strong>#{item.rank}</strong>
                  <span className="meta">{item.source}</span>
                </div>
                <div>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.title}
                  </a>
                </div>
                <div className="meta">{item.short_reason}</div>
                <div className="actions">
                  <button className="primary" onClick={() => void sendFeedback(item.item_id, "saved")}>Save</button>
                  <button className="warn" onClick={() => void sendFeedback(item.item_id, "skipped")}>Skip</button>
                </div>
              </article>
            ))}
          </section>
        ))}

        {!loading && !groups.length && <p className="meta">표시할 피드가 없습니다.</p>}
      </section>

      <section className="panel">
        <div className="row">
          <strong>북마크</strong>
          <button onClick={() => void loadBookmarks()}>새로고침</button>
        </div>
        {bookmarks.map((b) => (
          <article className="item" key={b.item_id}>
            <a href={b.url} target="_blank" rel="noreferrer">
              {b.title}
            </a>
            <div className="meta">{b.source}</div>
          </article>
        ))}
        {!bookmarks.length && <p className="meta">아직 저장한 항목이 없습니다.</p>}
      </section>
    </main>
  );
}

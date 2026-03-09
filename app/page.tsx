import { fetchStockFeedServer, fetchTodayFeedServer } from "../lib/api";
import FeedClient from "../components/feed-client";
import type { FeedGroup, FeedItem, StockFeedResponse } from "../lib/types";

function toInitialFeed(
  data: { generated_at?: string | null; groups?: FeedGroup[]; items?: FeedItem[] } | null,
  fallbackCategory: string,
) {
  if (!data) return null;
  const groups =
    data.groups && data.groups.length > 0
      ? data.groups
      : data.items && data.items.length > 0
        ? [{ category: fallbackCategory, items: data.items }]
        : [];
  if (!groups.length) return null;
  return {
    generated_at: data.generated_at ?? null,
    groups,
  };
}

function toInitialStockFeed(data: StockFeedResponse | null) {
  if (!data) return null;
  const groups =
    data.groups && data.groups.length > 0
      ? data.groups
      : data.items && data.items.length > 0
        ? [{ category: "stock-feed", items: data.items }]
        : [];
  return {
    generated_at: data.generated_at ?? null,
    groups,
    page: data.page,
    size: data.size,
    total: data.total,
    total_pages: data.total_pages,
    has_next: data.has_next,
    has_prev: data.has_prev,
  };
}

export default async function HomePage() {
  const [curatedData, stockData] = await Promise.all([
    fetchTodayFeedServer(),
    fetchStockFeedServer(),
  ]);

  return (
    <FeedClient
      initialCuratedFeed={toInitialFeed(curatedData, "general")}
      initialStockFeed={toInitialStockFeed(stockData)}
    />
  );
}

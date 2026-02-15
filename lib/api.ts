import {
  BookmarkResponse,
  FeedbackAction,
  FeedResponse,
  KeywordSentimentsResponse,
  Slot
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const PUBLIC_ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "";

async function toErrorCode(res: Response, defaultCode: string): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string };
    if (data?.detail) {
      return `${defaultCode}:${data.detail}`;
    }
  } catch {
    return `${defaultCode}_${res.status}`;
  }
  return `${defaultCode}_${res.status}`;
}

export async function fetchTodayFeed(slot: Slot): Promise<FeedResponse> {
  const res = await fetch(`${API_BASE}/feeds/today?slot=${slot}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "feed_error"));
  }
  return (await res.json()) as FeedResponse;
}

export async function fetchBookmarks(page: number, size: number): Promise<BookmarkResponse> {
  const res = await fetch(`${API_BASE}/bookmarks?page=${page}&size=${size}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "bookmarks_error"));
  }
  return (await res.json()) as BookmarkResponse;
}

export async function sendFeedback(itemId: number, action: FeedbackAction): Promise<void> {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_id: itemId, action })
  });
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "feedback_error"));
  }
}

export function sendClickEvent(itemId: number) {
  void fetch(`${API_BASE}/events/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_id: itemId }),
    keepalive: true
  }).catch(() => undefined);
}

type KeywordSentimentParams = {
  dateFrom?: string;
  dateTo?: string;
  minFeedback?: number;
  limit?: number;
  adminToken?: string;
};

export async function fetchKeywordSentiments(params: KeywordSentimentParams): Promise<KeywordSentimentsResponse> {
  const token = params.adminToken ?? PUBLIC_ADMIN_TOKEN;
  if (!token) {
    throw new Error("admin_token_missing");
  }

  const qs = new URLSearchParams();
  if (params.dateFrom) qs.set("date_from", params.dateFrom);
  if (params.dateTo) qs.set("date_to", params.dateTo);
  if (typeof params.minFeedback === "number") qs.set("min_feedback", String(params.minFeedback));
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));

  const res = await fetch(`${API_BASE}/admin/keyword-sentiments?${qs.toString()}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "keyword_sentiments_error"));
  }
  return (await res.json()) as KeywordSentimentsResponse;
}

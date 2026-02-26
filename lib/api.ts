import {
  AskResult,
  BookmarkResponse,
  FeedbackAction,
  FeedResponse,
  FullGraphResponse,
  InsightAdminListResponse,
  InsightListResponse,
  InsightPost,
  InsightPostAdmin,
  KeywordSentimentsResponse,
  SimilarityGraphResponse,
  Slot,
  TimelineResponse,
  User,
  UserStatsResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const DEFAULT_OPTS: RequestInit = { credentials: "include" };

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

export async function fetchMe(): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { ...DEFAULT_OPTS, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as User | null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { ...DEFAULT_OPTS, method: "POST" });
}

export async function fetchTodayFeed(slot: Slot): Promise<FeedResponse> {
  const res = await fetch(`${API_BASE}/feeds/today?slot=${slot}`, { ...DEFAULT_OPTS, cache: "no-store" });
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "feed_error"));
  }
  return (await res.json()) as FeedResponse;
}

export async function fetchTodayFeedServer(slot: Slot): Promise<FeedResponse | null> {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${API}/feeds/today?slot=${slot}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as FeedResponse;
  } catch {
    return null;
  }
}

export async function fetchBookmarks(page: number, size: number): Promise<BookmarkResponse> {
  const res = await fetch(`${API_BASE}/bookmarks?page=${page}&size=${size}`, { ...DEFAULT_OPTS, cache: "no-store" });
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "bookmarks_error"));
  }
  return (await res.json()) as BookmarkResponse;
}

export async function sendFeedback(itemId: number, action: FeedbackAction): Promise<void> {
  const res = await fetch(`${API_BASE}/feedback`, {
    ...DEFAULT_OPTS,
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
    ...DEFAULT_OPTS,
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
};

export async function askBookmarks(query: string, topK = 5): Promise<AskResult> {
  const res = await fetch(`${API_BASE}/bookmarks/ask`, {
    ...DEFAULT_OPTS,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK }),
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "ask_error"));
  }
  return (await res.json()) as AskResult;
}

export async function fetchKeywordSentiments(params: KeywordSentimentParams): Promise<KeywordSentimentsResponse> {
  const qs = new URLSearchParams();
  if (params.dateFrom) qs.set("date_from", params.dateFrom);
  if (params.dateTo) qs.set("date_to", params.dateTo);
  if (typeof params.minFeedback === "number") qs.set("min_feedback", String(params.minFeedback));
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));

  const res = await fetch(`${API_BASE}/admin/keyword-sentiments?${qs.toString()}`, {
    ...DEFAULT_OPTS,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "keyword_sentiments_error"));
  }
  return (await res.json()) as KeywordSentimentsResponse;
}

export async function fetchFullGraph(
  keyword: string,
  depth = 1,
  options?: { maxKeywordNodes?: number; maxArticlesPerKeyword?: number }
): Promise<FullGraphResponse> {
  const qs = new URLSearchParams({ keyword, depth: String(depth) });
  if (options?.maxKeywordNodes) qs.set("max_keyword_nodes", String(options.maxKeywordNodes));
  if (options?.maxArticlesPerKeyword) qs.set("max_articles_per_keyword", String(options.maxArticlesPerKeyword));
  const res = await fetch(
    `${API_BASE}/bookmarks/graph?${qs.toString()}`,
    { ...DEFAULT_OPTS, cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "graph_error"));
  }
  return (await res.json()) as FullGraphResponse;
}

export async function fetchTimeline(days = 30): Promise<TimelineResponse> {
  const res = await fetch(
    `${API_BASE}/bookmarks/timeline?days=${days}`,
    { ...DEFAULT_OPTS, cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "timeline_error"));
  }
  return (await res.json()) as TimelineResponse;
}

export async function fetchSimilarityGraph(
  keyword: string,
  options?: { threshold?: number; limit?: number; maxArticlesPerKeyword?: number }
): Promise<SimilarityGraphResponse> {
  const qs = new URLSearchParams({ keyword });
  if (options?.threshold !== undefined) qs.set("threshold", String(options.threshold));
  if (options?.limit !== undefined) qs.set("limit", String(options.limit));
  if (options?.maxArticlesPerKeyword !== undefined) qs.set("max_articles_per_keyword", String(options.maxArticlesPerKeyword));
  const res = await fetch(
    `${API_BASE}/bookmarks/graph/similarity?${qs.toString()}`,
    { ...DEFAULT_OPTS, cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "similarity_graph_error"));
  }
  return (await res.json()) as SimilarityGraphResponse;
}

// ── Insight Posts (Public) ──────────────────────────────────────────────────

export async function fetchInsightPosts(limit = 20, offset = 0): Promise<InsightListResponse> {
  const res = await fetch(`${API_BASE}/insights/posts?limit=${limit}&offset=${offset}`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error(await toErrorCode(res, "insights_error"));
  return (await res.json()) as InsightListResponse;
}

export async function fetchInsightPost(slug: string): Promise<InsightPost> {
  const res = await fetch(`${API_BASE}/insights/posts/${encodeURIComponent(slug)}`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error(await toErrorCode(res, "insight_error"));
  return (await res.json()) as InsightPost;
}

// ── Insight Posts (Admin, cookie auth) ─────────────────────────────────────

export async function fetchAdminInsightPosts(): Promise<InsightAdminListResponse> {
  const res = await fetch(`${API_BASE}/admin/insights/posts`, {
    ...DEFAULT_OPTS,
    cache: "no-store"
  });
  if (!res.ok) throw new Error(await toErrorCode(res, "admin_insights_error"));
  return (await res.json()) as InsightAdminListResponse;
}

export async function createInsightDraft(days = 7): Promise<InsightPostAdmin> {
  const res = await fetch(`${API_BASE}/admin/insights/draft`, {
    ...DEFAULT_OPTS,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days })
  });
  if (!res.ok) throw new Error(await toErrorCode(res, "draft_create_error"));
  return (await res.json()) as InsightPostAdmin;
}

export async function patchInsightPost(
  id: number,
  patch: { title?: string; summary?: string; body?: string }
): Promise<InsightPostAdmin> {
  const res = await fetch(`${API_BASE}/admin/insights/posts/${id}`, {
    ...DEFAULT_OPTS,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error(await toErrorCode(res, "patch_error"));
  return (await res.json()) as InsightPostAdmin;
}

export async function publishInsightPost(id: number): Promise<InsightPostAdmin> {
  const res = await fetch(`${API_BASE}/admin/insights/posts/${id}/publish`, {
    ...DEFAULT_OPTS,
    method: "POST"
  });
  if (!res.ok) throw new Error(await toErrorCode(res, "publish_error"));
  return (await res.json()) as InsightPostAdmin;
}

export async function unpublishInsightPost(id: number): Promise<InsightPostAdmin> {
  const res = await fetch(`${API_BASE}/admin/insights/posts/${id}/unpublish`, {
    ...DEFAULT_OPTS,
    method: "POST"
  });
  if (!res.ok) throw new Error(await toErrorCode(res, "unpublish_error"));
  return (await res.json()) as InsightPostAdmin;
}

export async function deleteInsightPost(postId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/insights/posts/${postId}`, {
    ...DEFAULT_OPTS,
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "delete_post_error"));
  }
}

export async function fetchUserStats(options?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<UserStatsResponse> {
  const qs = new URLSearchParams();
  if (options?.dateFrom) qs.set("date_from", options.dateFrom);
  if (options?.dateTo) qs.set("date_to", options.dateTo);
  const url = `${API_BASE}/admin/user-stats${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, { ...DEFAULT_OPTS, cache: "no-store" });
  if (!res.ok) {
    throw new Error(await toErrorCode(res, "user_stats_error"));
  }
  return (await res.json()) as UserStatsResponse;
}

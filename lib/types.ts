export type Slot = "am" | "pm";

export type CurationAction = "saved" | "skipped";
export type PreferenceAction = "liked" | "disliked";
export type FeedbackAction = CurationAction | PreferenceAction;

export type FeedItem = {
  item_id: number;
  title: string;
  translated_title_ko?: string | null;
  source: string;
  category: string;
  url: string;
  short_reason: string;
  rank: number;
  saved: boolean;
  skipped: boolean;
  liked?: boolean;
  disliked?: boolean;
  curation_action?: CurationAction | null;
  preference_action?: PreferenceAction | null;
  feedback_action?: string | null;
  keywords?: string[];
};

export type FeedGroup = {
  category: string;
  items: FeedItem[];
};

export type FeedResponse = {
  feed_date: string;
  slot: Slot;
  generated_at: string;
  items: FeedItem[];
  groups?: FeedGroup[];
};

export type BookmarkItem = {
  item_id: number;
  title: string;
  url: string;
  source: string;
  saved: boolean;
  saved_at?: string;
};

export type BookmarkResponse = {
  page: number;
  size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  items: BookmarkItem[];
};

export type SentimentLabel =
  | "very_positive"
  | "positive"
  | "mixed"
  | "neutral"
  | "negative"
  | "very_negative";

export type KeywordSentimentItem = {
  keyword: string;
  liked_count: number;
  disliked_count: number;
  total_items: number;
  sentiment_score: number;
  sentiment_label: SentimentLabel | string;
};

export type KeywordSentimentsResponse = {
  date_from: string;
  date_to: string;
  total_keywords: number;
  keywords: KeywordSentimentItem[];
};

export type AskSource = {
  item_id: number;
  title: string;
  url: string;
  similarity: number;
};

export type AskResult = {
  answer: string;
  sources: AskSource[];
};

export type AskHistoryEntry = {
  query: string;
  result: AskResult;
};

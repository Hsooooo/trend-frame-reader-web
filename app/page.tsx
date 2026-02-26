import { fetchTodayFeedServer } from "../lib/api";
import FeedClient from "../components/feed-client";
import type { FeedGroup } from "../lib/types";

export default async function HomePage() {
  const data = await fetchTodayFeedServer();

  const initialFeed: { generated_at: string; groups: FeedGroup[] } | null =
    data && (data.groups && data.groups.length > 0 || data.items && data.items.length > 0)
      ? {
          generated_at: data.generated_at,
          groups:
            data.groups && data.groups.length > 0
              ? data.groups
              : [{ category: "general", items: data.items ?? [] }]
        }
      : null;

  return <FeedClient initialFeed={initialFeed} />;
}

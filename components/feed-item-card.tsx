import { FeedItem, FeedbackAction } from "../lib/types";

type Props = {
  item: FeedItem;
  curationPending: boolean;
  preferencePending: boolean;
  onFeedback: (item: FeedItem, action: FeedbackAction) => void;
  onClickItem: (itemId: number) => void;
};

type CurationAction = "saved" | "skipped";
type PreferenceAction = "liked" | "disliked";

function curationLabel(action?: CurationAction | null): string {
  if (action === "saved") return "Saved";
  if (action === "skipped") return "Skipped";
  return "";
}

function preferenceLabel(action?: PreferenceAction | null): string {
  if (action === "liked") return "Liked";
  if (action === "disliked") return "Disliked";
  return "";
}

export default function FeedItemCard({
  item,
  curationPending,
  preferencePending,
  onFeedback,
  onClickItem
}: Props) {
  const curationAction = item.curation_action ?? (item.saved ? "saved" : item.skipped ? "skipped" : null);
  const preferenceAction = item.preference_action ?? (item.liked ? "liked" : item.disliked ? "disliked" : null);
  const curationDone = Boolean(curationAction);
  const preferenceDone = Boolean(preferenceAction);

  const displayTitle = item.translated_title_ko?.trim() ? item.translated_title_ko : item.title;
  const hasTranslatedTitle = Boolean(item.translated_title_ko && item.translated_title_ko !== item.title);

  return (
    <article className="item">
      <div className="row">
        <strong>#{item.rank}</strong>
        <span className="meta">{item.source}</span>
      </div>

      <div>
        <a href={item.url} target="_blank" rel="noreferrer" onClick={() => onClickItem(item.item_id)}>
          {displayTitle}
        </a>
      </div>

      {hasTranslatedTitle && <div className="meta original-title">EN: {item.title}</div>}
      <div className="meta">{item.short_reason}</div>

      {item.keywords && item.keywords.length > 0 && (
        <div className="keywords">
          {item.keywords.slice(0, 5).map((kw) => (
            <span key={kw} className="badge keyword">{kw}</span>
          ))}
        </div>
      )}

      {(curationDone || preferenceDone) && (
        <div className="status">
          {curationAction && <span className={`badge ${curationAction}`}>{curationLabel(curationAction)}</span>}
          {preferenceAction && <span className={`badge ${preferenceAction}`}>{preferenceLabel(preferenceAction)}</span>}
        </div>
      )}

      <div className="action-grid">
        <div className="actions">
          <button className="primary" disabled={curationDone || curationPending} onClick={() => onFeedback(item, "saved")}>
            Save
          </button>
          <button className="warn" disabled={curationDone || curationPending} onClick={() => onFeedback(item, "skipped")}>
            Skip
          </button>
        </div>

        <div className="actions">
          <button className="like" disabled={preferenceDone || preferencePending} onClick={() => onFeedback(item, "liked")}>
            Like
          </button>
          <button
            className="dislike"
            disabled={preferenceDone || preferencePending}
            onClick={() => onFeedback(item, "disliked")}
          >
            Dislike
          </button>
        </div>
      </div>
    </article>
  );
}

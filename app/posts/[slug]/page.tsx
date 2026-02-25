"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchInsightPost } from "../../../lib/api";
import { InsightPost } from "../../../lib/types";

// ── simple markdown → JSX renderer ──────────────────────────────────────────

function parseInline(text: string, baseKey: string): React.ReactNode {
  const segments: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|_(.+?)_/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) segments.push(text.slice(lastIdx, m.index));
    if (m[1] !== undefined) {
      segments.push(
        <a key={`${baseKey}-l${i++}`} href={m[2]} target="_blank" rel="noreferrer">
          {m[1]}
        </a>
      );
    } else if (m[3] !== undefined) {
      segments.push(<strong key={`${baseKey}-b${i++}`}>{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      segments.push(<em key={`${baseKey}-i${i++}`}>{m[4]}</em>);
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) segments.push(text.slice(lastIdx));
  return segments.length === 1 ? segments[0] : <>{segments}</>;
}

function renderMarkdown(body: string): React.ReactNode {
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (line.startsWith("#### ")) {
      elements.push(<h4 key={i}>{parseInline(line.slice(5), `h4-${i}`)}</h4>);
      i++; continue;
    }
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i}>{parseInline(line.slice(4), `h3-${i}`)}</h3>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i}>{parseInline(line.slice(3), `h2-${i}`)}</h2>);
      i++; continue;
    }

    if (line.startsWith("> ")) {
      elements.push(<blockquote key={i}>{parseInline(line.slice(2), `bq-${i}`)}</blockquote>);
      i++; continue;
    }

    if (line.startsWith("- ")) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(<li key={i}>{parseInline(lines[i].slice(2), `li-${i}`)}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`}>{items}</ul>);
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter((l) => !/^\|[-:\s|]+\|$/.test(l))
        .map((l) =>
          l
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
        );
      if (rows.length > 0) {
        const [head, ...bodyRows] = rows;
        elements.push(
          <div key={`tw-${i}`} className="post-table-wrap">
            <table className="post-table">
              <thead>
                <tr>{head.map((c, j) => <th key={j}>{parseInline(c, `th-${i}-${j}`)}</th>)}</tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((c, j) => <td key={j}>{parseInline(c, `td-${i}-${ri}-${j}`)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    elements.push(<p key={i}>{parseInline(line, `p-${i}`)}</p>);
    i++;
  }

  return <>{elements}</>;
}

// ── Page component ────────────────────────────────────────────────────────────

export default function PostDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [post, setPost] = useState<InsightPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    void (async () => {
      try {
        const data = await fetchInsightPost(slug);
        setPost(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "post_load_failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  return (
    <main>
      <Link href="/posts" className="back-link">← 목록으로</Link>

      {loading && <p className="meta" style={{ marginTop: 20 }}>불러오는 중...</p>}
      {error && <p className="error" style={{ marginTop: 20 }}>{error}</p>}

      {post && (
        <article className="post-article">
          <header className="post-header">
            <div className="post-period">{post.period_start} ~ {post.period_end}</div>
            <h1 className="post-title">{post.title}</h1>
            {post.summary && <p className="post-summary">{post.summary}</p>}
            {post.published_at && (
              <div className="meta">
                발행:{" "}
                {new Date(post.published_at).toLocaleDateString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </div>
            )}
          </header>
          <div className="post-body">
            {post.body ? renderMarkdown(post.body) : <p className="meta">본문이 없습니다.</p>}
          </div>
        </article>
      )}
    </main>
  );
}

"use client";

import type { ReactNode } from "react";
import type { MarketTickerGraphResponse } from "../../../lib/types";

type MarketGraphViewProps = {
  data: MarketTickerGraphResponse;
  onTickerClick: (ticker: string) => void;
};

function formatDate(iso?: string | null): string {
  if (!iso) return "날짜 미상";
  try {
    return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch {
    return iso;
  }
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="market-section">
      <div className="market-section-header">
        <div className="market-section-title">{title}</div>
        {subtitle && <div className="market-section-subtitle">{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

export default function MarketGraphView({ data, onTickerClick }: MarketGraphViewProps) {
  const focusNode = data.ticker_nodes.find((node) => node.is_focus);

  return (
    <div className="market-grid">
      <div className="market-stats-grid">
        <div className="market-stat-card market-stat-card--focus">
          <div className="market-stat-label market-stat-label--focus">FOCUS</div>
          <div className="market-stat-value market-stat-value--focus">
            {data.focus_ticker}
          </div>
          <div className="market-stat-sub">
            {focusNode?.exchange ? `${focusNode.exchange} · ` : ""}
            언급 {focusNode?.mention_count ?? 0}회
          </div>
        </div>
        {[
          ["기사", data.article_nodes.length],
          ["기업", data.company_nodes.length],
          ["이벤트", data.event_nodes.length],
          ["테마", data.theme_nodes.length],
        ].map(([label, count]) => (
          <div key={label} className="market-stat-card">
            <div className="market-stat-label">{label}</div>
            <div className="market-stat-value">{count}</div>
          </div>
        ))}
      </div>

      <div className="market-sections-grid">
        <Section title="연결 티커" subtitle="북마크 기사에서 함께 등장한 티커">
          <div className="entity-chips">
            {data.ticker_nodes.map((ticker) => (
              <button
                key={ticker.id}
                onClick={() => onTickerClick(ticker.symbol)}
                className={`entity-chip entity-chip--ticker${ticker.is_focus ? " active" : ""}`}
              >
                <span>{ticker.symbol}</span>
                <span className="entity-chip-count">{ticker.mention_count}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="연결 기업" subtitle="기사에서 추출된 canonical company">
          <div className="entity-chips">
            {data.company_nodes.length > 0 ? (
              data.company_nodes.map((company) => (
                <span key={company.id} className="entity-chip entity-chip--company">
                  <span>{company.canonical_name}</span>
                  <span className="entity-chip-count">{company.mention_count}</span>
                </span>
              ))
            ) : (
              <span className="market-empty">추출된 기업이 없습니다</span>
            )}
          </div>
        </Section>

        <Section title="이벤트" subtitle="실적, 가이던스, 파트너십 같은 신호">
          <div className="entity-chips">
            {data.event_nodes.length > 0 ? (
              data.event_nodes.map((event) => (
                <span key={event.id} className="entity-chip entity-chip--event">
                  <span>{event.label}</span>
                  <span className="entity-chip-count">{event.count}</span>
                </span>
              ))
            ) : (
              <span className="market-empty">추출된 이벤트가 없습니다</span>
            )}
          </div>
        </Section>

        <Section title="테마" subtitle="기사 묶음에서 반복된 시장 테마">
          <div className="entity-chips">
            {data.theme_nodes.length > 0 ? (
              data.theme_nodes.map((theme) => (
                <span key={theme.id} className="entity-chip entity-chip--theme">
                  <span>{theme.name}</span>
                  <span className="entity-chip-count">{theme.count}</span>
                </span>
              ))
            ) : (
              <span className="market-empty">추출된 테마가 없습니다</span>
            )}
          </div>
        </Section>
      </div>

      <Section
        title="근거 기사"
        subtitle="이 티커 그래프를 구성한 북마크 기사 원문 목록"
      >
        <div className="market-grid">
          {data.article_nodes.map((article) => (
            <article key={article.id} className="market-article-card">
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="market-article-title"
              >
                {article.title}
              </a>
              <div className="market-article-meta">
                {[article.source, formatDate(article.published_at)].filter(Boolean).join(" · ")}
              </div>

              <div className="market-article-entities">
                {article.tickers.length > 0 && (
                  <div className="market-article-chips">
                    {article.tickers.map((ticker) => (
                      <button
                        key={`${article.id}_${ticker}`}
                        onClick={() => onTickerClick(ticker)}
                        className="entity-chip entity-chip--ticker-article"
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                )}

                {article.companies.length > 0 && (
                  <div className="market-article-chips">
                    {article.companies.map((company) => (
                      <span
                        key={`${article.id}_${company}`}
                        className="entity-chip entity-chip--company"
                      >
                        {company}
                      </span>
                    ))}
                  </div>
                )}

                {(article.events.length > 0 || article.themes.length > 0) && (
                  <div className="market-article-chips">
                    {article.events.map((event) => (
                      <span
                        key={`${article.id}_${event}`}
                        className="entity-chip entity-chip--event"
                      >
                        {event}
                      </span>
                    ))}
                    {article.themes.map((theme) => (
                      <span
                        key={`${article.id}_${theme}`}
                        className="entity-chip entity-chip--theme"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </Section>
    </div>
  );
}

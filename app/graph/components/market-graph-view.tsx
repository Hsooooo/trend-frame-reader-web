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

function entityChipStyle(background: string, border: string, color: string) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background,
    color,
    fontSize: "0.82rem",
    lineHeight: 1.35,
  } as const;
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
    <section
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "14px 14px 12px",
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#101828" }}>{title}</div>
        {subtitle && (
          <div style={{ marginTop: 3, fontSize: "0.78rem", color: "#667085" }}>{subtitle}</div>
        )}
      </div>
      {children}
    </section>
  );
}

export default function MarketGraphView({ data, onTickerClick }: MarketGraphViewProps) {
  const focusNode = data.ticker_nodes.find((node) => node.is_focus);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #99f6e4",
            background: "#ecfeff",
          }}
        >
          <div style={{ fontSize: "0.78rem", color: "#0f766e", fontWeight: 700 }}>FOCUS</div>
          <div style={{ marginTop: 4, fontSize: "1.15rem", color: "#134e4a", fontWeight: 800 }}>
            {data.focus_ticker}
          </div>
          <div style={{ marginTop: 3, fontSize: "0.8rem", color: "#115e59" }}>
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
          <div
            key={label}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#fff",
            }}
          >
            <div style={{ fontSize: "0.78rem", color: "#667085", fontWeight: 700 }}>{label}</div>
            <div style={{ marginTop: 4, fontSize: "1.15rem", color: "#101828", fontWeight: 800 }}>
              {count}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <Section title="연결 티커" subtitle="북마크 기사에서 함께 등장한 티커">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.ticker_nodes.map((ticker) => (
              <button
                key={ticker.id}
                onClick={() => onTickerClick(ticker.symbol)}
                style={{
                  ...entityChipStyle(
                    ticker.is_focus ? "#ccfbf1" : "#f8fafc",
                    ticker.is_focus ? "#5eead4" : "#d0d5dd",
                    ticker.is_focus ? "#0f766e" : "#344054"
                  ),
                  cursor: "pointer",
                  fontWeight: ticker.is_focus ? 700 : 600,
                }}
              >
                <span>{ticker.symbol}</span>
                <span style={{ opacity: 0.72 }}>{ticker.mention_count}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="연결 기업" subtitle="기사에서 추출된 canonical company">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.company_nodes.length > 0 ? (
              data.company_nodes.map((company) => (
                <span
                  key={company.id}
                  style={entityChipStyle("#eef4ff", "#c7d7fe", "#1d4ed8")}
                >
                  <span>{company.canonical_name}</span>
                  <span style={{ opacity: 0.7 }}>{company.mention_count}</span>
                </span>
              ))
            ) : (
              <span style={{ fontSize: "0.82rem", color: "#98a2b3" }}>추출된 기업이 없습니다</span>
            )}
          </div>
        </Section>

        <Section title="이벤트" subtitle="실적, 가이던스, 파트너십 같은 신호">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.event_nodes.length > 0 ? (
              data.event_nodes.map((event) => (
                <span
                  key={event.id}
                  style={entityChipStyle("#fff4ed", "#fed7aa", "#c2410c")}
                >
                  <span>{event.label}</span>
                  <span style={{ opacity: 0.7 }}>{event.count}</span>
                </span>
              ))
            ) : (
              <span style={{ fontSize: "0.82rem", color: "#98a2b3" }}>추출된 이벤트가 없습니다</span>
            )}
          </div>
        </Section>

        <Section title="테마" subtitle="기사 묶음에서 반복된 시장 테마">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.theme_nodes.length > 0 ? (
              data.theme_nodes.map((theme) => (
                <span
                  key={theme.id}
                  style={entityChipStyle("#f5f3ff", "#ddd6fe", "#6d28d9")}
                >
                  <span>{theme.name}</span>
                  <span style={{ opacity: 0.7 }}>{theme.count}</span>
                </span>
              ))
            ) : (
              <span style={{ fontSize: "0.82rem", color: "#98a2b3" }}>추출된 테마가 없습니다</span>
            )}
          </div>
        </Section>
      </div>

      <Section
        title="근거 기사"
        subtitle="이 티커 그래프를 구성한 북마크 기사 원문 목록"
      >
        <div style={{ display: "grid", gap: 10 }}>
          {data.article_nodes.map((article) => (
            <article
              key={article.id}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  color: "#101828",
                  fontWeight: 700,
                  textDecoration: "none",
                  lineHeight: 1.45,
                }}
              >
                {article.title}
              </a>
              <div style={{ marginTop: 6, fontSize: "0.8rem", color: "#667085" }}>
                {[article.source, formatDate(article.published_at)].filter(Boolean).join(" · ")}
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {article.tickers.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {article.tickers.map((ticker) => (
                      <button
                        key={`${article.id}_${ticker}`}
                        onClick={() => onTickerClick(ticker)}
                        style={{
                          ...entityChipStyle("#ecfeff", "#99f6e4", "#0f766e"),
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                )}

                {article.companies.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {article.companies.map((company) => (
                      <span
                        key={`${article.id}_${company}`}
                        style={entityChipStyle("#eef4ff", "#c7d7fe", "#1d4ed8")}
                      >
                        {company}
                      </span>
                    ))}
                  </div>
                )}

                {(article.events.length > 0 || article.themes.length > 0) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {article.events.map((event) => (
                      <span
                        key={`${article.id}_${event}`}
                        style={entityChipStyle("#fff4ed", "#fed7aa", "#c2410c")}
                      >
                        {event}
                      </span>
                    ))}
                    {article.themes.map((theme) => (
                      <span
                        key={`${article.id}_${theme}`}
                        style={entityChipStyle("#f5f3ff", "#ddd6fe", "#6d28d9")}
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

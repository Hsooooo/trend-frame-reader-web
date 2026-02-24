"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────────────

type KeywordCloudItem = {
  keyword: string;
  frequency: number;
  sentiment_score: number;
};

type KeywordCloudResponse = {
  total: number;
  keywords: KeywordCloudItem[];
};

type NeighborItem = {
  keyword: string;
  count: number;
  doc_frequency: number;
};

type ExploreResponse = {
  keyword: string;
  doc_frequency: number;
  bookmark_frequency: number;
  sentiment_score: number;
  neighbors: NeighborItem[];
};

// ── D3 graph node/link shapes ─────────────────────────────────────────────────

type GraphNode = d3.SimulationNodeDatum & {
  id: string;
  isRoot: boolean;
  doc_frequency: number;
  bookmark_frequency: number;
  sentiment_score: number;
};

type GraphLink = d3.SimulationLinkDatum<GraphNode> & {
  count: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function nodeRadius(node: GraphNode): number {
  const base = node.isRoot ? node.bookmark_frequency : node.doc_frequency;
  return Math.max(18, Math.min(40, 18 + base * 1.4));
}

function nodeColor(node: GraphNode): string {
  if (node.isRoot) return "#0f766e";
  if (node.sentiment_score > 0.3) return "#86efac";
  if (node.sentiment_score < -0.3) return "#fca5a5";
  return "#e2e8f0";
}

function nodeBorderColor(node: GraphNode): string {
  if (node.isRoot) return "#0d9488";
  if (node.sentiment_score > 0.3) return "#4ade80";
  if (node.sentiment_score < -0.3) return "#f87171";
  return "#cbd5e1";
}

function linkWidth(count: number): number {
  return Math.max(1, Math.min(5, count * 0.6));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GraphPage() {
  const svgRef = useRef<SVGSVGElement>(null);

  const [cloud, setCloud] = useState<KeywordCloudItem[]>([]);
  const [graphData, setGraphData] = useState<ExploreResponse | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/bookmarks/keywords?limit=30`, { cache: "no-store" });
        if (!res.ok) throw new Error(`keywords_error_${res.status}`);
        const data: KeywordCloudResponse = await res.json();
        setCloud(data.keywords);
        if (data.keywords.length > 0 && !activeKeyword) {
          await loadGraph(data.keywords[0].keyword);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "keyword_load_failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGraph = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/bookmarks/explore?keyword=${encodeURIComponent(keyword)}&depth=1`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`explore_error_${res.status}`);
      const data: ExploreResponse = await res.json();
      setGraphData(data);
      setActiveKeyword(keyword);
    } catch (e) {
      setError(e instanceof Error ? e.message : "graph_load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── D3 rendering ───────────────────────────────────────────────────────────

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !graphData) return;

    // Clear previous render
    d3.select(svg).selectAll("*").remove();

    const width = svg.clientWidth || 860;
    const height = 500;

    // Build nodes
    const rootNode: GraphNode = {
      id: graphData.keyword,
      isRoot: true,
      doc_frequency: graphData.doc_frequency,
      bookmark_frequency: graphData.bookmark_frequency,
      sentiment_score: graphData.sentiment_score,
      x: width / 2,
      y: height / 2,
      fx: undefined,
      fy: undefined,
    };

    const neighborNodes: GraphNode[] = (graphData.neighbors ?? []).map((n) => ({
      id: n.keyword,
      isRoot: false,
      doc_frequency: n.doc_frequency,
      bookmark_frequency: 0,
      sentiment_score: 0,
      x: undefined,
      y: undefined,
    }));

    const nodes: GraphNode[] = [rootNode, ...neighborNodes];

    const links: GraphLink[] = (graphData.neighbors ?? []).map((n) => ({
      source: graphData.keyword,
      target: n.keyword,
      count: n.count,
    }));

    // SVG setup
    const svgSel = d3
      .select(svg)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Defs: subtle drop shadow
    const defs = svgSel.append("defs");
    const filter = defs.append("filter").attr("id", "node-shadow").attr("x", "-30%").attr("y", "-30%").attr("width", "160%").attr("height", "160%");
    filter.append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 3).attr("flood-color", "rgba(0,0,0,0.12)");

    // Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<GraphNode>().radius((d) => nodeRadius(d) + 10)
      );

    // Edges
    const linkGroup = svgSel.append("g").attr("class", "links");
    const linkEls = linkGroup
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#d0d5dd")
      .attr("stroke-width", (d) => linkWidth(d.count))
      .attr("stroke-linecap", "round");

    // Nodes group
    const nodeGroup = svgSel.append("g").attr("class", "nodes");

    const nodeEls = nodeGroup
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", (d) => (d.isRoot ? "default" : "pointer"))
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = undefined;
            d.fy = undefined;
          })
      );

    // Circles
    nodeEls
      .append("circle")
      .attr("r", (d) => nodeRadius(d))
      .attr("fill", (d) => nodeColor(d))
      .attr("stroke", (d) => nodeBorderColor(d))
      .attr("stroke-width", (d) => (d.isRoot ? 2.5 : 1.5))
      .attr("filter", "url(#node-shadow)");

    // Root node inner ring accent
    nodeEls
      .filter((d) => d.isRoot)
      .append("circle")
      .attr("r", (d) => nodeRadius(d) - 5)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.3)")
      .attr("stroke-width", 1.5);

    // Labels
    nodeEls
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => nodeRadius(d) + 14)
      .attr("font-size", "12px")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif")
      .attr("fill", (d) => (d.isRoot ? "#101828" : "#475467"))
      .attr("font-weight", (d) => (d.isRoot ? "600" : "400"))
      .text((d) => d.id);

    // Click to explore neighbor
    nodeEls.on("click", (_event, d) => {
      if (!d.isRoot) {
        void loadGraph(d.id);
      }
    });

    // Hover highlight
    nodeEls
      .on("mouseenter", function (_event, d) {
        if (!d.isRoot) {
          d3.select<SVGGElement, GraphNode>(this)
            .select("circle")
            .transition()
            .duration(150)
            .attr("stroke-width", 2.5);
        }
      })
      .on("mouseleave", function (_event, d) {
        d3.select<SVGGElement, GraphNode>(this)
          .select("circle")
          .transition()
          .duration(150)
          .attr("stroke-width", d.isRoot ? 2.5 : 1.5);
      });

    // Tick
    simulation.on("tick", () => {
      linkEls
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

      nodeEls.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, loadGraph]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSearch = () => {
    if (searchInput.trim()) {
      void loadGraph(searchInput.trim());
      setSearchInput("");
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>키워드 그래프</h1>
        <a
          href="/"
          style={{
            fontSize: "0.875rem",
            color: "#475467",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 12px",
            border: "1px solid #d0d5dd",
            borderRadius: 10,
            background: "#fff",
          }}
        >
          ← 피드로 돌아가기
        </a>
      </div>
      <p style={{ margin: "0 0 16px", color: "#475467" }}>
        북마크에서 추출한 키워드 간 연결 관계를 탐색합니다. 노드를 클릭하면 해당 키워드를 중심으로 그래프가 재구성됩니다.
      </p>

      {/* Keyword cloud */}
      {cloud.length > 0 && (
        <section
          className="panel"
          style={{ marginBottom: 0 }}
        >
          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: "0.9rem", color: "#344054" }}>인기 키워드</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cloud.map((item) => {
              const isActive = item.keyword === activeKeyword;
              return (
                <button
                  key={item.keyword}
                  onClick={() => void loadGraph(item.keyword)}
                  style={{
                    borderRadius: "999px",
                    padding: "4px 12px",
                    fontSize: "0.82rem",
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    border: isActive ? "1.5px solid #0f766e" : "1px solid #d0d5dd",
                    background: isActive ? "#ccfbf1" : "#fff",
                    color: isActive ? "#0f766e" : "#475467",
                    transition: "background 0.15s, border-color 0.15s, color 0.15s",
                    lineHeight: "1.4",
                  }}
                >
                  {item.keyword}
                  <span
                    style={{
                      marginLeft: 5,
                      fontSize: "0.75rem",
                      opacity: 0.65,
                    }}
                  >
                    {item.frequency}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Search */}
      <section className="panel" style={{ marginTop: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="키워드 직접 탐색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={{
              flex: 1,
              border: "1px solid #d0d5dd",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: "0.92rem",
              color: "#101828",
              background: "#fff",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            className="primary"
            onClick={handleSearch}
            disabled={!searchInput.trim() || loading}
          >
            탐색
          </button>
        </div>
      </section>

      {/* Graph */}
      <section className="panel" style={{ marginTop: 10, padding: "14px 14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#344054" }}>
            {activeKeyword ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    background: "#ccfbf1",
                    color: "#0f766e",
                    border: "1px solid #5eead4",
                    borderRadius: "999px",
                    padding: "2px 10px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    marginRight: 6,
                  }}
                >
                  {activeKeyword}
                </span>
                {graphData && (
                  <span style={{ fontSize: "0.82rem", color: "#475467", fontWeight: 400 }}>
                    문서 {graphData.doc_frequency}건 · 북마크 {graphData.bookmark_frequency}건
                    {graphData.neighbors.length > 0
                      ? ` · 연결 키워드 ${graphData.neighbors.length}개`
                      : ""}
                  </span>
                )}
              </>
            ) : (
              <span style={{ color: "#475467", fontWeight: 400 }}>키워드를 선택하거나 검색하세요</span>
            )}
          </div>
          {loading && (
            <span style={{ fontSize: "0.82rem", color: "#475467" }}>불러오는 중...</span>
          )}
        </div>

        {error && (
          <p style={{ color: "#b42318", fontSize: "0.88rem", margin: "0 0 10px" }}>{error}</p>
        )}

        {/* Legend */}
        {graphData && (
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 10,
              fontSize: "0.78rem",
              color: "#475467",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#0f766e" }} />
              중심 키워드
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#86efac" }} />
              긍정
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#fca5a5" }} />
              부정
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#e2e8f0" }} />
              중립
            </span>
          </div>
        )}

        <div
          style={{
            width: "100%",
            height: 500,
            background: "#f8fafc",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Always render SVG so ref is always attached */}
          <svg
            ref={svgRef}
            style={{ width: "100%", height: "100%", display: "block" }}
          />

          {/* Overlay: empty state */}
          {!graphData && !loading && !error && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                fontSize: "0.9rem",
                pointerEvents: "none",
              }}
            >
              그래프가 여기에 표시됩니다
            </div>
          )}

          {/* Overlay: no neighbors */}
          {graphData && graphData.neighbors.length === 0 && !loading && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                color: "#94a3b8",
                fontSize: "0.82rem",
                pointerEvents: "none",
              }}
            >
              연결된 키워드가 없습니다
            </div>
          )}
        </div>

        {graphData && graphData.neighbors.length > 0 && (
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "0.78rem",
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            노드를 드래그하거나 클릭해서 탐색하세요
          </p>
        )}
      </section>
    </main>
  );
}

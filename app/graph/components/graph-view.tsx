"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { FullGraphResponse } from "@/lib/types";

type GraphViewProps = {
  data: FullGraphResponse;
  onKeywordClick: (keyword: string) => void;
};

// ── Node types ──────────────────────────────────────────────────────────────

type NodeKind = "keyword" | "article";

type GraphNode = d3.SimulationNodeDatum & {
  id: string;
  kind: NodeKind;
  label: string;
  url?: string;
  radius: number;
  fillColor: string;
  strokeColor: string;
};

type GraphLink = d3.SimulationLinkDatum<GraphNode> & {
  edgeType: "cooccurrence" | "has_keyword";
  weight: number;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function keywordRadius(freq: number): number {
  return Math.max(18, Math.min(40, 18 + freq * 1.4));
}

function keywordFill(sentiment: number): string {
  if (sentiment > 0.3) return "#86efac";
  if (sentiment < -0.3) return "#fca5a5";
  return "#0f766e";
}

function keywordStroke(sentiment: number): string {
  if (sentiment > 0.3) return "#4ade80";
  if (sentiment < -0.3) return "#f87171";
  return "#0d9488";
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function GraphView({ data, onKeywordClick }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    d3.select(svg).selectAll("*").remove();

    const width = svg.clientWidth || 860;
    const height = 540;

    // Build nodes
    const nodes: GraphNode[] = [];
    const nodeMap = new Map<string, GraphNode>();

    for (const kw of data.keyword_nodes) {
      const node: GraphNode = {
        id: kw.id,
        kind: "keyword",
        label: kw.keyword,
        radius: keywordRadius(Math.max(kw.doc_frequency, kw.bookmark_frequency)),
        fillColor: keywordFill(kw.sentiment_score),
        strokeColor: keywordStroke(kw.sentiment_score),
      };
      nodes.push(node);
      nodeMap.set(kw.id, node);
    }

    for (const art of data.article_nodes) {
      const node: GraphNode = {
        id: art.id,
        kind: "article",
        label: truncate(art.title, 20),
        url: art.url,
        radius: 8,
        fillColor: "#60a5fa",
        strokeColor: "#3b82f6",
      };
      nodes.push(node);
      nodeMap.set(art.id, node);
    }

    // Build links (only if both ends exist)
    const links: GraphLink[] = data.edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        edgeType: e.type as "cooccurrence" | "has_keyword",
        weight: e.weight,
      }));

    // SVG setup
    const svgSel = d3
      .select(svg)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Defs
    const defs = svgSel.append("defs");
    const filter = defs
      .append("filter")
      .attr("id", "fg-shadow")
      .attr("x", "-30%")
      .attr("y", "-30%")
      .attr("width", "160%")
      .attr("height", "160%");
    filter
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 2)
      .attr("stdDeviation", 3)
      .attr("flood-color", "rgba(0,0,0,0.1)");

    // Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => (d.edgeType === "cooccurrence" ? 120 : 80))
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<GraphNode>().radius((d) => d.radius + 6)
      );

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "graph-tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Edges
    const linkEls = svgSel
      .append("g")
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d) => (d.edgeType === "cooccurrence" ? "#d0d5dd" : "#bfdbfe"))
      .attr("stroke-width", (d) =>
        d.edgeType === "cooccurrence" ? Math.max(1, Math.min(5, d.weight * 0.6)) : 1
      )
      .attr("stroke-dasharray", (d) => (d.edgeType === "has_keyword" ? "4 3" : "none"))
      .attr("stroke-linecap", "round");

    // Node groups
    const nodeEls = svgSel
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
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

    // Circles for all nodes
    nodeEls
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.fillColor)
      .attr("stroke", (d) => d.strokeColor)
      .attr("stroke-width", (d) => (d.kind === "keyword" ? 2 : 1.5))
      .attr("filter", "url(#fg-shadow)");

    // Labels
    nodeEls
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius + 14)
      .attr("font-size", (d) => (d.kind === "keyword" ? "12px" : "10px"))
      .attr("fill", (d) => (d.kind === "keyword" ? "#101828" : "#475467"))
      .attr("font-weight", (d) => (d.kind === "keyword" ? "600" : "400"))
      .attr("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif")
      .text((d) => d.label);

    // Click handlers
    nodeEls.on("click", (_event, d) => {
      if (d.kind === "keyword") {
        onKeywordClick(d.label);
      } else if (d.url) {
        window.open(d.url, "_blank", "noopener");
      }
    });

    // Hover
    nodeEls
      .on("mouseenter", function (event, d) {
        d3.select(this).select("circle").transition().duration(150).attr("stroke-width", 3);
        const label =
          d.kind === "article"
            ? (data.article_nodes.find((a) => a.id === d.id)?.title ?? d.label)
            : d.label;
        tooltip
          .html(`<strong>${label}</strong>`)
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 10}px`)
          .transition()
          .duration(100)
          .style("opacity", 1);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 10}px`);
      })
      .on("mouseleave", function (_event, d) {
        d3.select(this)
          .select("circle")
          .transition()
          .duration(150)
          .attr("stroke-width", d.kind === "keyword" ? 2 : 1.5);
        tooltip.transition().duration(200).style("opacity", 0);
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
      tooltip.remove();
    };
  }, [data, onKeywordClick]);

  return (
    <div
      style={{
        width: "100%",
        height: 540,
        background: "#f8fafc",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 14,
          display: "flex",
          gap: 14,
          fontSize: "0.78rem",
          color: "#475467",
          background: "rgba(255,255,255,0.85)",
          padding: "4px 10px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#0f766e" }} />
          키워드
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#60a5fa" }} />
          기사
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#86efac" }} />
          긍정
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#fca5a5" }} />
          부정
        </span>
      </div>
    </div>
  );
}

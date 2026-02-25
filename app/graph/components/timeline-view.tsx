"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { TimelineResponse } from "../../../lib/types";

type TimelineViewProps = {
  data: TimelineResponse;
};

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function TimelineView({ data }: TimelineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || data.articles.length === 0) return;

    d3.select(svg).selectAll("*").remove();

    const margin = { top: 30, right: 30, bottom: 40, left: 30 };
    const minWidth = 800;
    const width = Math.max(minWidth, data.articles.length * 20);
    const height = 340;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // Parse dates
    const articles = data.articles.map((a) => ({
      ...a,
      date: new Date(a.saved_at),
    }));

    const extent = d3.extent(articles, (a) => a.date) as [Date, Date];
    // Expand range slightly
    const dayMs = 86400000;
    const xMin = new Date(extent[0].getTime() - dayMs);
    const xMax = new Date(extent[1].getTime() + dayMs);

    const xScale = d3.scaleTime().domain([xMin, xMax]).range([0, innerW]);

    // Jitter y to avoid overlap
    const yCenter = innerH / 2;
    const jitterSeed = (i: number) => ((i * 2654435761) % 100) / 100; // deterministic jitter
    const jitterRange = innerH * 0.35;

    const svgSel = d3
      .select(svg)
      .attr("width", width)
      .attr("height", height);

    const g = svgSel
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(d3.timeDay.every(Math.max(1, Math.ceil(articles.length / 20))) ?? 7)
          .tickFormat(d3.timeFormat("%m/%d") as (d: Date | d3.NumberValue) => string)
      )
      .selectAll("text")
      .attr("font-size", "11px")
      .attr("fill", "#475467");

    // Horizontal guide line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", yCenter)
      .attr("y2", yCenter)
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1);

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "graph-tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Dots
    g.selectAll("circle")
      .data(articles)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (_, i) => yCenter + (jitterSeed(i) - 0.5) * 2 * jitterRange)
      .attr("r", 6)
      .attr("fill", "#60a5fa")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this).transition().duration(100).attr("r", 9).attr("stroke-width", 2.5);
        const kws = d.keywords.length > 0 ? `<br/><span style="color:#64748b">${d.keywords.slice(0, 5).join(", ")}</span>` : "";
        tooltip
          .html(
            `<strong>${truncate(d.title, 50)}</strong><br/>` +
            `<span style="color:#64748b">${d.source ?? ""} · ${d3.timeFormat("%Y-%m-%d")(d.date)}</span>` +
            kws
          )
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 10}px`)
          .transition()
          .duration(100)
          .style("opacity", 1);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 10}px`);
      })
      .on("mouseleave", function () {
        d3.select(this).transition().duration(150).attr("r", 6).attr("stroke-width", 1.5);
        tooltip.transition().duration(200).style("opacity", 0);
      })
      .on("click", (_, d) => {
        window.open(d.url, "_blank", "noopener");
      });

    return () => {
      tooltip.remove();
    };
  }, [data]);

  if (data.articles.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: 340,
          background: "#f8fafc",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: "0.9rem",
        }}
      >
        타임라인에 표시할 기사가 없습니다
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        overflowX: "auto",
        background: "#f8fafc",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
      }}
    >
      <svg ref={svgRef} style={{ display: "block", minHeight: 340 }} />
    </div>
  );
}

"use client";

type Tab = "graph" | "similarity" | "timeline";

type TabBarProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="graph-tab-bar">
      <button
        className={`graph-tab${activeTab === "graph" ? " active" : ""}`}
        onClick={() => onTabChange("graph")}
      >
        그래프
      </button>
      <button
        className={`graph-tab${activeTab === "similarity" ? " active" : ""}`}
        onClick={() => onTabChange("similarity")}
      >
        유사도
      </button>
      <button
        className={`graph-tab${activeTab === "timeline" ? " active" : ""}`}
        onClick={() => onTabChange("timeline")}
      >
        타임라인
      </button>
    </div>
  );
}

export type { Tab };

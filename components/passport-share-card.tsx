"use client";

import { useState } from "react";
import { Check, Download, Share2 } from "lucide-react";

export type PassportMetrics = {
  experiences_completed: number;
  regions_explored: number;
  local_experiences_supported: number;
  cultural_preparation_completed: number;
  responsible_alternatives_selected: number;
};

export function PassportShareCard({ metrics, achievements }: { metrics: PassportMetrics; achievements: string[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const summary = [
    `My MICHI Cultural Passport: ${metrics.experiences_completed} cultural experiences completed across ${metrics.regions_explored} regions.`,
    `${metrics.local_experiences_supported} local host experiences supported · ${metrics.cultural_preparation_completed} cultural preparations completed · ${metrics.responsible_alternatives_selected} responsible alternatives selected.`,
    achievements.length ? `Earned acknowledgments: ${achievements.join(", ")}.` : "I’m beginning my cultural travel journey.",
  ].join("\n");

  async function share() {
    setMessage(null);
    try {
      if (navigator.share) {
        await navigator.share({ title: "My MICHI Cultural Passport", text: summary });
        setMessage("Passport summary shared.");
        return;
      }
      await navigator.clipboard.writeText(summary);
      setMessage("Passport summary copied. It contains aggregate counts and achievement names only.");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setMessage("Sharing is unavailable in this browser. You can still share a screenshot of this passport card.");
    }
  }

  function downloadCard() {
    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("xmlns", namespace);
    svg.setAttribute("viewBox", "0 0 1200 720");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "MICHI Cultural Passport summary card");
    svg.style.fontFamily = "Georgia, serif";
    const element = (name: string, attrs: Record<string, string>, text?: string) => {
      const node = document.createElementNS(namespace, name);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      if (text) node.textContent = text;
      svg.append(node);
      return node;
    };
    element("rect", { x: "0", y: "0", width: "1200", height: "720", fill: "#f4f1e9" });
    element("rect", { x: "1184", y: "0", width: "16", height: "720", fill: "#a5422b" });
    element("text", { x: "64", y: "78", fill: "#52634e", "font-size": "18", "letter-spacing": "4" }, "MICHI · REFLECTION PASSPORT");
    element("text", { x: "64", y: "146", fill: "#202b2d", "font-size": "48" }, "A journey measured in understanding.");
    element("text", { x: "64", y: "190", fill: "#586164", "font-size": "21", "font-family": "Arial, sans-serif" }, "A personal record of participation, learning, and community support.");
    const positions = [[64, 300], [430, 300], [796, 300], [247, 430], [613, 430]] as const;
    const labels = ["Experiences completed", "Regions explored", "Local experiences supported", "Preparations completed", "Responsible alternatives"];
    for (const [index, [x, y]] of positions.entries()) {
      element("text", { x: String(x), y: String(y), fill: "#202b2d", "font-size": "54" }, String(stats[index][1]));
      element("text", { x: String(x), y: String(y + 35), fill: "#586164", "font-size": "18", "font-family": "Arial, sans-serif" }, labels[index]);
    }
    element("line", { x1: "64", y1: "510", x2: "1120", y2: "510", stroke: "#c9c6bd", "stroke-width": "2" });
    element("text", { x: "64", y: "558", fill: "#52634e", "font-size": "16", "letter-spacing": "3" }, "EARNED ACKNOWLEDGMENTS");
    element("text", { x: "64", y: "602", fill: "#202b2d", "font-size": "25" }, achievements.length ? achievements.slice(0, 5).join("  ·  ") : "Beginning a cultural travel journey");
    element("text", { x: "64", y: "670", fill: "#727777", "font-size": "15", "font-family": "Arial, sans-serif" }, "Shared summary only · No itinerary details or private reflections");
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "michi-cultural-passport.svg";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Passport card downloaded. It includes totals and achievement names only.");
  }

  const stats = [
    ["Experiences completed", metrics.experiences_completed],
    ["Regions explored", metrics.regions_explored],
    ["Local experiences supported", metrics.local_experiences_supported],
    ["Preparations completed", metrics.cultural_preparation_completed],
    ["Responsible alternatives", metrics.responsible_alternatives_selected],
  ] as const;

  return <section id="passport-summary" className="relative overflow-hidden border border-ink/15 bg-[#f4f1e9] p-6 sm:p-8" aria-labelledby="passport-summary-title">
    <div className="absolute inset-y-0 right-0 w-1.5 bg-vermilion" aria-hidden="true" />
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div><p className="eyebrow">MICHI · Reflection passport</p><h2 id="passport-summary-title" className="mt-2 font-serif text-2xl sm:text-3xl">A journey measured in understanding.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-ink/65">A personal record of participation, learning, and community support.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void share()} className="inline-flex min-h-11 items-center gap-2 border border-ink/20 bg-white px-4 text-sm font-semibold hover:border-ink/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion"><Share2 className="size-4" aria-hidden="true" />Share summary</button><button type="button" onClick={downloadCard} className="inline-flex min-h-11 items-center gap-2 border border-ink/20 px-4 text-sm font-semibold hover:border-ink/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion"><Download className="size-4" aria-hidden="true" />Download card</button></div>
    </div>
    <dl className="mt-7 grid grid-cols-2 border-y border-ink/15 sm:grid-cols-3 lg:grid-cols-5">{stats.map(([label, value], index) => <div key={label} className={`py-4 ${index % 2 ? "pl-4" : ""} ${index > 0 ? "border-l border-ink/10 sm:pl-5" : ""} ${index >= 2 ? "border-t sm:border-t-0" : ""}`}><dd className="font-serif text-3xl tabular-nums">{value}</dd><dt className="mt-1 pr-2 text-[11px] leading-4 text-ink/60">{label}</dt></div>)}</dl>
    <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink/55"><Check className="mt-0.5 size-3.5 shrink-0 text-moss" aria-hidden="true" />The share action includes aggregate counts and earned acknowledgment names. It never includes itinerary details or written reflections.</p>
    {message ? <p role="status" className="mt-3 text-xs text-moss">{message}</p> : null}
  </section>;
}

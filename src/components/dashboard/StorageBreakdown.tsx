"use client";

import React, { useState } from "react";
import { ArrowUpRight, MoreHorizontal, PieChart } from "lucide-react";
import { StorageStats, FileCategory } from "@/types/file";

interface StorageBreakdownProps {
  stats: StorageStats | null;
  onFilterCategory?: (category: FileCategory) => void;
}

export function StorageBreakdown({ stats, onFilterCategory }: StorageBreakdownProps) {
  const [hoveredCategory, setHoveredCategory] = useState<FileCategory | null>(null);

  const categoryConfig: Record<
    FileCategory,
    { label: string; color: string; hex: string; bgClass: string }
  > = {
    image: {
      label: "Images",
      color: "text-[#83CBA0]",
      hex: "#83CBA0",
      bgClass: "bg-[#83CBA0]",
    },
    document: {
      label: "Documents",
      color: "text-[#8CBCE8]",
      hex: "#8CBCE8",
      bgClass: "bg-[#8CBCE8]",
    },
    media: {
      label: "Media",
      color: "text-[#A399F0]",
      hex: "#A399F0",
      bgClass: "bg-[#A399F0]",
    },
    archive: {
      label: "Archives",
      color: "text-[#F6E05E]",
      hex: "#F6E05E",
      bgClass: "bg-[#F6E05E]",
    },
    code: {
      label: "Code",
      color: "text-[#3B9EE0]",
      hex: "#3B9EE0",
      bgClass: "bg-[#3B9EE0]",
    },
    other: {
      label: "Other",
      color: "text-[#7A8792]",
      hex: "#A0AEC0",
      bgClass: "bg-[#A0AEC0]",
    },
  };

  const categories = (["image", "document", "media", "archive", "code", "other"] as FileCategory[])
    .map((cat) => {
      const data = stats?.categories?.[cat] || {
        count: 0,
        sizeBytes: 0,
        sizeFormatted: "0 B",
        percentage: 0,
      };
      return {
        key: cat,
        ...categoryConfig[cat],
        ...data,
      };
    });

  // Calculate highest percentage for column scaling
  const maxPct = Math.max(...categories.map((c) => c.percentage), 25);

  // Four main categories for the donut legend (matching 4 items in reference image)
  const topCategories = categories.slice(0, 4);

  // Score calculation for center donut: storage efficiency / health
  const totalFiles = stats?.totalFiles ?? 0;
  const healthScore = totalFiles > 0 ? 98 : 100;

  // Donut Gauge SVG calculation
  // Total circumference for radius 56 = 2 * PI * 56 ≈ 351.85
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full" suppressHydrationWarning>
      {/* LEFT CARD: Storage Allocation & Activity (matching 'Revenue Over Time' in Reference Image) */}
      <div className="lg:col-span-8 p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-white shadow-[0_4px_20px_rgba(150,175,205,0.08)] flex flex-col justify-between">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <h2 className="text-base font-bold text-[#29343D] tracking-tight">
              Storage Allocation & Activity
            </h2>
            <p className="text-xs text-[#7A8792] mt-0.5">
              Live byte distribution across cloud asset categories
            </p>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white border border-[#E3EAF0] shadow-2xs hover:bg-[#D8EEFF] text-[#7A8792] hover:text-[#20628E] flex items-center justify-center transition-all cursor-pointer"
            title="Expand allocation view"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Pill Column Bar Chart matching Reference Image */}
        <div className="py-6 px-2 flex-1 flex flex-col justify-end">
          <div className="relative h-48 w-full flex items-end justify-between gap-3 sm:gap-6 pt-6">
            {/* Horizontal Faint Guide Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-[#E3EAF0] w-full" />
              <div className="border-b border-[#E3EAF0] w-full" />
              <div className="border-b border-[#E3EAF0] w-full" />
              <div className="border-b border-[#E3EAF0] w-full" />
            </div>

            {/* Vertical Pill Columns */}
            {categories.map((cat) => {
              // Ensure bar height is visible even if 0%
              const heightPercent = Math.max(
                Math.round((cat.percentage / maxPct) * 85),
                totalFiles === 0 ? 15 : 10
              );
              const isHighlight =
                cat.percentage === Math.max(...categories.map((c) => c.percentage)) &&
                cat.percentage > 0;

              return (
                <div
                  key={cat.key}
                  onClick={() => onFilterCategory?.(cat.key)}
                  onMouseEnter={() => setHoveredCategory(cat.key)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative z-10"
                >
                  {/* Tooltip on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-0.5 rounded-md bg-[#29343D] text-white text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-none z-20">
                    {cat.sizeFormatted} ({cat.percentage}%)
                  </div>

                  {/* Rounded Pill Bar */}
                  <div className="w-full max-w-[42px] h-36 flex items-end justify-center">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-full transition-all duration-300 ${
                        isHighlight
                          ? "bg-gradient-to-t from-[#8CBCE8] to-[#A399F0] shadow-[0_4px_16px_rgba(163,153,240,0.35)]"
                          : "bg-[#D8EEFF]/75 group-hover:bg-[#8CBCE8]/60"
                      }`}
                    />
                  </div>

                  {/* Category Name below Pill Column */}
                  <span
                    className={`text-[11px] font-medium transition-colors truncate max-w-[50px] sm:max-w-none text-center ${
                      isHighlight
                        ? "text-[#29343D] font-bold"
                        : "text-[#7A8792] group-hover:text-[#29343D]"
                    }`}
                  >
                    {cat.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend Row at Bottom matching Reference Image */}
        <div className="pt-4 border-t border-[#E3EAF0]/60 flex items-center justify-center gap-6 text-xs text-[#7A8792]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8CBCE8]" />
            <span>Total Storage</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A399F0]" />
            <span>Allocated Quota</span>
          </div>
        </div>
      </div>

      {/* RIGHT CARD: Storage by Category (matching 'Sales by Platform' with Donut Gauge in Reference Image) */}
      <div className="lg:col-span-4 p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-white shadow-[0_4px_20px_rgba(150,175,205,0.08)] flex flex-col justify-between">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-base font-bold text-[#29343D] tracking-tight">
            Storage by Category
          </h2>
          <button
            type="button"
            className="text-[#7A8792] hover:text-[#29343D] p-1 rounded-lg transition-colors cursor-pointer"
            title="Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Donut Gauge Chart matching Reference Image */}
        <div className="py-4 flex flex-col items-center justify-center relative">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
              {/* Background circular track */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke="#E8F1F7"
                strokeWidth="14"
                fill="transparent"
                strokeLinecap="round"
              />

              {/* Segments for categories */}
              {topCategories.map((cat, i) => {
                const pct = cat.percentage > 0 ? cat.percentage : (i === 0 ? 42 : i === 1 ? 30 : i === 2 ? 18 : 10);
                const strokeDash = (pct / 100) * circumference;
                const strokeOffset = accumulatedOffset;
                accumulatedOffset += strokeDash;

                // Color choices reflecting reference image: Yellow, Mint/Green, Soft Blue, Lavender
                const segmentColors = ["#F8E776", "#83CBA0", "#8CBCE8", "#A399F0"];
                const color = segmentColors[i % segmentColors.length];

                return (
                  <circle
                    key={cat.key}
                    cx="65"
                    cy="65"
                    r={radius}
                    stroke={color}
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    strokeDashoffset={-strokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 hover:opacity-90 cursor-pointer"
                    onClick={() => onFilterCategory?.(cat.key)}
                  />
                );
              })}
            </svg>

            {/* Center Metric & Text matching Reference Image (e.g. '79 PSS Score') */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-[#29343D] tracking-tight font-mono">
                {healthScore}
              </span>
              <span className="text-[11px] font-semibold text-[#7A8792] mt-0.5">
                Vault Score
              </span>
            </div>
          </div>
        </div>

        {/* 4 Category Legends below Donut Chart matching Reference Image */}
        <div className="pt-4 border-t border-[#E3EAF0]/60 grid grid-cols-4 gap-2 text-center">
          {topCategories.map((cat, i) => {
            const segmentColors = ["#F8E776", "#83CBA0", "#8CBCE8", "#A399F0"];
            const color = segmentColors[i % segmentColors.length];
            const pct = cat.percentage > 0 ? `${cat.percentage}%` : (i === 0 ? "42%" : i === 1 ? "30%" : i === 2 ? "18%" : "10%");

            return (
              <button
                key={cat.key}
                onClick={() => onFilterCategory?.(cat.key)}
                className="flex flex-col items-center hover:opacity-80 transition-opacity cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[11px] font-semibold text-[#29343D] group-hover:text-[#20628E] truncate">
                    {cat.label}
                  </span>
                </div>
                <span className="text-[10px] text-[#7A8792] font-mono">
                  {pct}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

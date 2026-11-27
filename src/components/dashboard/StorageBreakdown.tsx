"use client";

import React from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { StorageStats, FileCategory } from "@/types/file";

interface StorageBreakdownProps {
  stats: StorageStats | null;
  onFilterCategory?: (category: FileCategory) => void;
  onViewAllFiles?: () => void;
}

const CATEGORY_CONFIG: Record<
  FileCategory,
  { label: string; hex: string }
> = {
  image: { label: "Images", hex: "#83CBA0" },
  document: { label: "Documents", hex: "#8CBCE8" },
  media: { label: "Media", hex: "#A399F0" },
  archive: { label: "Archives", hex: "#F6E05E" },
  code: { label: "Code", hex: "#3B9EE0" },
  other: { label: "Other", hex: "#A0AEC0" },
};

const ALL_CATEGORIES: FileCategory[] = [
  "image",
  "document",
  "media",
  "archive",
  "code",
  "other",
];

export function StorageBreakdown({
  stats,
  onFilterCategory,
  onViewAllFiles,
}: StorageBreakdownProps) {
  const categories = ALL_CATEGORIES.map((cat) => {
    const data = stats?.categories?.[cat] || {
      count: 0,
      sizeBytes: 0,
      sizeFormatted: "0 B",
      percentage: 0,
    };
    return {
      key: cat,
      ...CATEGORY_CONFIG[cat],
      ...data,
    };
  });

  const totalFiles = stats?.totalFiles ?? 0;
  const totalSizeBytes = stats?.totalSizeBytes ?? 0;
  const maxPct = Math.max(...categories.map((c) => c.percentage), 1);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full"
      suppressHydrationWarning
    >
      {/* LEFT CARD: Storage Allocation & Activity */}
      <div className="lg:col-span-8 p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-white shadow-[0_4px_20px_rgba(150,175,205,0.08)] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h2 className="text-base font-bold text-[#29343D] tracking-tight">
              Storage Allocation & Activity
            </h2>
            <p className="text-xs text-[#7A8792] mt-0.5">
              Live byte distribution across cloud asset categories
            </p>
          </div>
          {onViewAllFiles && (
            <button
              type="button"
              onClick={onViewAllFiles}
              className="w-8 h-8 rounded-full bg-white border border-[#E3EAF0] shadow-2xs hover:bg-[#D8EEFF] text-[#7A8792] hover:text-[#20628E] flex items-center justify-center transition-all cursor-pointer"
              title="Open file manager"
              aria-label="Open file manager"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="py-6 px-2 flex-1 flex flex-col justify-end">
          <div className="relative h-48 w-full flex items-end justify-between gap-3 sm:gap-6 pt-6">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-[#E3EAF0] w-full" />
              <div className="border-b border-[#E3EAF0] w-full" />
              <div className="border-b border-[#E3EAF0] w-full" />
              <div className="border-b border-[#E3EAF0] w-full" />
            </div>

            {categories.map((cat) => {
              const heightPercent =
                cat.sizeBytes > 0
                  ? Math.max(Math.round((cat.percentage / maxPct) * 85), 12)
                  : 6;
              const isHighlight =
                cat.percentage ===
                  Math.max(...categories.map((c) => c.percentage)) &&
                cat.sizeBytes > 0;

              return (
                <div
                  key={cat.key}
                  onClick={() => onFilterCategory?.(cat.key)}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative z-10"
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-0.5 rounded-md bg-[#29343D] text-white text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-none z-20">
                    {cat.count} file{cat.count === 1 ? "" : "s"} •{" "}
                    {cat.sizeFormatted} ({cat.percentage}%)
                  </div>

                  <div className="w-full max-w-[42px] h-36 flex items-end justify-center">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-full transition-all duration-300 ${
                        cat.sizeBytes === 0
                          ? "bg-[#E3EAF0]/60 group-hover:bg-[#D8EEFF]"
                          : isHighlight
                          ? "bg-gradient-to-t from-[#8CBCE8] to-[#A399F0] shadow-[0_4px_16px_rgba(163,153,240,0.35)]"
                          : "bg-[#D8EEFF]/80 group-hover:bg-[#8CBCE8]/70"
                      }`}
                    />
                  </div>

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

        <div className="pt-4 border-t border-[#E3EAF0]/60 flex items-center justify-center gap-6 text-xs text-[#7A8792]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8CBCE8]" />
            <span>Category Usage</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A399F0]" />
            <span>Largest Category</span>
          </div>
        </div>
      </div>

      {/* RIGHT CARD: Storage by Category */}
      <div className="lg:col-span-4 p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-white shadow-[0_4px_20px_rgba(150,175,205,0.08)] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-base font-bold text-[#29343D] tracking-tight">
            Storage by Category
          </h2>
          {onViewAllFiles && (
            <button
              type="button"
              onClick={onViewAllFiles}
              className="text-[#7A8792] hover:text-[#29343D] p-1 rounded-lg transition-colors cursor-pointer"
              title="Browse all files"
              aria-label="Browse all files"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="py-4 flex flex-col items-center justify-center relative">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke="#E8F1F7"
                strokeWidth="14"
                fill="transparent"
                strokeLinecap="round"
              />

              {totalSizeBytes > 0 &&
                categories
                  .filter((cat) => cat.sizeBytes > 0)
                  .map((cat) => {
                    const exactPct = (cat.sizeBytes / totalSizeBytes) * 100;
                    const strokeDash = (exactPct / 100) * circumference;
                    const strokeOffset = accumulatedOffset;
                    accumulatedOffset += strokeDash;

                    return (
                      <circle
                        key={cat.key}
                        cx="65"
                        cy="65"
                        r={radius}
                        stroke={cat.hex}
                        strokeWidth="14"
                        fill="transparent"
                        strokeDasharray={`${strokeDash} ${circumference}`}
                        strokeDashoffset={-strokeOffset}
                        strokeLinecap="butt"
                        className="transition-all duration-500 hover:opacity-90 cursor-pointer"
                        onClick={() => onFilterCategory?.(cat.key)}
                      />
                    );
                  })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <span className="text-xl sm:text-2xl font-extrabold text-[#29343D] tracking-tight font-mono truncate max-w-full">
                {stats?.totalSizeFormatted || "0 B"}
              </span>
              <span className="text-[11px] font-semibold text-[#7A8792] mt-0.5">
                {totalFiles} {totalFiles === 1 ? "Object" : "Objects"}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E3EAF0]/60 grid grid-cols-3 gap-x-2 gap-y-2.5 text-center">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => onFilterCategory?.(cat.key)}
              className="flex flex-col items-center hover:opacity-80 transition-opacity cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.hex }}
                />
                <span className="text-[11px] font-semibold text-[#29343D] group-hover:text-[#20628E] truncate">
                  {cat.label}
                </span>
              </div>
              <span className="text-[10px] text-[#7A8792] font-mono">
                {cat.percentage}%
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

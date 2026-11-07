"use client";

import React from "react";
import {
  PieChart,
  Image,
  FileText,
  Film,
  Archive,
  Code,
  HelpCircle,
} from "lucide-react";
import { StorageStats, FileCategory } from "@/types/file";

interface StorageBreakdownProps {
  stats: StorageStats | null;
  onFilterCategory?: (category: FileCategory) => void;
}

export function StorageBreakdown({ stats, onFilterCategory }: StorageBreakdownProps) {
  const categoryConfig: Record<
    FileCategory,
    { label: string; color: string; bgBar: string; icon: React.ElementType }
  > = {
    image: {
      label: "Images",
      color: "text-emerald-600",
      bgBar: "bg-emerald-500",
      icon: Image,
    },
    document: {
      label: "Documents",
      color: "text-sky-600",
      bgBar: "bg-sky-500",
      icon: FileText,
    },
    media: {
      label: "Media",
      color: "text-purple-600",
      bgBar: "bg-purple-500",
      icon: Film,
    },
    archive: {
      label: "Archives",
      color: "text-amber-600",
      bgBar: "bg-amber-500",
      icon: Archive,
    },
    code: {
      label: "Code",
      color: "text-indigo-600",
      bgBar: "bg-indigo-500",
      icon: Code,
    },
    other: {
      label: "Others",
      color: "text-slate-500",
      bgBar: "bg-slate-400",
      icon: HelpCircle,
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

  const totalFiles = stats?.totalFiles ?? 0;

  return (
    <div
      className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 space-y-5 w-full shadow-xs"
      suppressHydrationWarning
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Storage Allocation
            </h2>
            <p className="text-xs text-slate-500">
              Categorized breakdown of your stored assets
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          Total: <strong className="text-slate-900">{stats?.totalSizeFormatted || "0 B"}</strong>
        </div>
      </div>

      {/* Multi-segment Proportion Bar */}
      <div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
          {totalFiles === 0 ? (
            <div className="w-full h-full bg-slate-100" />
          ) : (
            categories.map((cat) => {
              if (cat.percentage <= 0) return null;
              return (
                <div
                  key={cat.key}
                  style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                  className={`h-full ${cat.bgBar} transition-all duration-300`}
                  title={`${cat.label}: ${cat.sizeFormatted} (${cat.percentage}%)`}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Responsive Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => onFilterCategory?.(cat.key)}
              className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/80 hover:border-slate-300 transition-all text-left flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${cat.color} shrink-0`} />
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                    {cat.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {cat.percentage}%
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 font-mono">
                  {cat.sizeFormatted}
                </p>
                <p className="text-[11px] text-slate-500">
                  {cat.count} file{cat.count === 1 ? "" : "s"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

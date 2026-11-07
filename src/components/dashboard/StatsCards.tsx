"use client";

import React from "react";
import { Files, HardDrive, ArrowUpRight } from "lucide-react";
import { StorageStats } from "@/types/file";

interface StatsCardsProps {
  stats: StorageStats | null;
  isLoading: boolean;
  onViewFiles: () => void;
  onOpenUpload: () => void;
}

export function StatsCards({
  stats,
  isLoading,
  onViewFiles,
  onOpenUpload,
}: StatsCardsProps) {
  const cards = [
    {
      title: "Total Files",
      value: isLoading ? "..." : (stats?.totalFiles ?? 0).toLocaleString(),
      subtext: "Stored in your cloud vault",
      icon: Files,
      color: "text-sky-600 bg-sky-50 border-sky-100",
      action: { label: "View all files", onClick: onViewFiles },
    },
    {
      title: "Storage Consumed",
      value: isLoading ? "..." : (stats?.totalSizeFormatted ?? "0 B"),
      subtext: `${(stats?.totalSizeBytes ?? 0).toLocaleString()} bytes utilized`,
      icon: HardDrive,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
      action: { label: "Upload new file", onClick: onOpenUpload },
    },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
      suppressHydrationWarning
    >
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            {/* Top Row: Title & Icon */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${card.color}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Middle Row: Value & Subtext */}
            <div className="my-3">
              <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono truncate">
                {card.value}
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {card.subtext}
              </p>
            </div>

            {/* Bottom Row: Action */}
            {card.action && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={card.action.onClick}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{card.action.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

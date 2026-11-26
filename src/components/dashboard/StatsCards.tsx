"use client";

import React from "react";
import { HelpCircle, ArrowUpRight } from "lucide-react";
import { StorageStats } from "@/types/file";

interface StatsCardsProps {
  stats: StorageStats | null;
  isLoading: boolean;
  onViewFiles: () => void;
  onOpenUpload: () => void;
  onViewArchitecture?: () => void;
  onViewSecurity?: () => void;
}

export function StatsCards({
  stats,
  isLoading,
  onViewFiles,
  onOpenUpload,
  onViewArchitecture,
  onViewSecurity,
}: StatsCardsProps) {
  const cards = [
    {
      title: "Total Files",
      value: isLoading ? "..." : (stats?.totalFiles ?? 0).toLocaleString(),
      trend: "+12%",
      trendType: "positive",
      accentBar: "bg-[#8CBCE8]",
      tooltip: "Total count of active objects stored in your CloudVault S3 bucket",
      onClick: onViewFiles,
      actionLabel: "View all",
    },
    {
      title: "Storage Consumed",
      value: isLoading ? "..." : (stats?.totalSizeFormatted ?? "0 B"),
      trend: "+24%",
      trendType: "primary",
      accentBar: "bg-[#A399F0]",
      tooltip: "Combined byte size of all uploaded files across all storage classes",
      onClick: onOpenUpload,
      actionLabel: "Upload file",
    },
    {
      title: "Cloud Durability",
      value: "99.999%",
      trend: "+99.9%",
      trendType: "positive",
      accentBar: "bg-[#83CBA0]",
      tooltip: "Designed for 11 9's of durability via multi-AZ data replication",
      onClick: onViewArchitecture,
      actionLabel: "Architecture",
    },
    {
      title: "Access Encryption",
      value: "256-bit AES",
      trend: "Active",
      trendType: "neutral",
      accentBar: "bg-[#A9D3F0]",
      tooltip: "Private at-rest server-side encryption with presigned expiring URLs",
      onClick: onViewSecurity,
      actionLabel: "Security",
    },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full"
      suppressHydrationWarning
    >
      {cards.map((card, idx) => {
        return (
          <div
            key={idx}
            onClick={card.onClick}
            className="group p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-white shadow-[0_4px_20px_rgba(150,175,205,0.08)] hover:shadow-[0_8px_25px_rgba(150,175,205,0.16)] hover:border-[#8CBCE8]/50 transition-all cursor-pointer flex flex-col justify-between"
          >
            {/* Top Row: Title & Info Circle matching Reference Image */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A8792]">
                {card.title}
              </span>
              <button
                type="button"
                className="text-[#A0AEC0] hover:text-[#29343D] transition-colors p-0.5 rounded-full"
                title={card.tooltip}
                onClick={(e) => {
                  e.stopPropagation();
                  card.onClick?.();
                }}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Middle Row: Large Bold Value & Trend Pill matching Reference Image */}
            <div className="my-3.5 flex items-baseline gap-2.5 flex-wrap">
              <span className="text-2xl sm:text-[26px] font-extrabold text-[#29343D] tracking-tight font-mono">
                {card.value}
              </span>

              {card.trend && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    card.trendType === "positive"
                      ? "bg-[#DDF3E4] text-[#1E633C]"
                      : card.trendType === "primary"
                      ? "bg-[#D8EEFF] text-[#20628E]"
                      : "bg-[#E6E1FA] text-[#29343D]"
                  }`}
                >
                  <span>{card.trend.startsWith("+") ? "↑" : ""}</span>
                  <span>{card.trend}</span>
                </span>
              )}
            </div>

            {/* Bottom Row: Accent Indicator Line & subtle action hint */}
            <div className="flex items-center justify-between pt-1">
              {/* Colored bottom-left accent bar exactly like Reference Image */}
              <div className={`h-1 rounded-full w-12 ${card.accentBar} transition-all group-hover:w-16`} />

              {card.actionLabel && (
                <span className="text-[11px] font-medium text-[#7A8792] group-hover:text-[#20628E] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>{card.actionLabel}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

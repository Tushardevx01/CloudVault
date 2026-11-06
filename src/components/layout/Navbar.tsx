"use client";

import React from "react";
import Link from "next/link";
import {
  Menu,
  RefreshCw,
  Search,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { ActiveTab, DEFAULT_AWS_REGION } from "@/lib/constants";

interface NavbarProps {
  activeTab: ActiveTab;
  onToggleSidebar: () => void;
  onOpenUpload: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  connectionStatus: "connected" | "disconnected" | "checking";
  connectionMessage?: string;
  region?: string;
}

export function Navbar({
  activeTab,
  onToggleSidebar,
  onOpenUpload,
  onRefresh,
  isRefreshing,
  searchTerm,
  onSearchChange,
  connectionStatus,
  connectionMessage,
  region = DEFAULT_AWS_REGION,
}: NavbarProps) {
  const titles: Record<ActiveTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: "Storage Dashboard",
      subtitle: "Overview of your cloud files, storage metrics, and Amazon S3 health",
    },
    files: {
      title: "File Manager",
      subtitle: "Browse, filter, preview, download, and delete files stored in S3",
    },
    "cloud-concepts": {
      title: "Cloud vs Local Storage",
      subtitle: "Academic architecture comparison and viva demonstration rubric",
    },
    system: {
      title: "System & AWS Health",
      subtitle: "Real-time bucket diagnostics, region verification, and configuration audit",
    },
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3 shrink-0">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Context */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="truncate">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {titles[activeTab].title}
            </h1>
            <p className="hidden sm:block text-xs text-slate-400 truncate">
              {titles[activeTab].subtitle}
            </p>
          </div>
        </div>

        {/* Right Actions Toolbar */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Quick Search Input */}
          <div className="relative hidden md:block w-56 lg:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search files by name..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            />
          </div>

          {/* S3 Live Connectivity Badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-medium cursor-help"
            title={connectionMessage || "S3 Connection Status"}
          >
            {connectionStatus === "connected" ? (
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold">S3 Connected</span>
                <span className="text-emerald-500/70 font-mono text-[10px]">({region})</span>
              </span>
            ) : connectionStatus === "checking" ? (
              <span className="flex items-center gap-1.5 text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20 text-[11px] animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                <span>Checking...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Check .env</span>
              </span>
            )}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh from Amazon S3"
            aria-label="Refresh data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-400" : ""}`}
            />
          </button>

          {/* Admin Link */}
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            title="Open Admin Console"
          >
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Admin</span>
          </Link>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-xs sm:text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>
    </header>
  );
}

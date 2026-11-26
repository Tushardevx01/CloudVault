"use client";

import React from "react";
import {
  Menu,
  RefreshCw,
  Search,
  Upload,
  Calendar,
  Bell,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import { ActiveTab } from "./Sidebar";

interface NavbarProps {
  activeTab: ActiveTab;
  onToggleSidebar: () => void;
  onOpenUpload: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  region?: string;
  currentUser?: { username: string; email: string; name: string } | null;
  onLogout?: () => void;
}

export function Navbar({
  activeTab,
  onToggleSidebar,
  onOpenUpload,
  onRefresh,
  isRefreshing,
  searchTerm,
  onSearchChange,
  region = "ap-south-1",
  currentUser,
}: NavbarProps) {
  const titles: Record<ActiveTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: `Welcome back, ${currentUser?.name || currentUser?.username || "Explorer"}!`,
      subtitle: "Overview of your files, storage allocation, and key metrics",
    },
    files: {
      title: "File Manager & Vault",
      subtitle: "Browse, filter, preview, download, and manage your cloud files",
    },
    "cloud-concepts": {
      title: "Cloud Architecture",
      subtitle: "POSIX local disk filesystems vs. distributed Amazon S3 object storage",
    },
    system: {
      title: "System & Security Health",
      subtitle: "S3 bucket connectivity, security compliance, and team metrics",
    },
  };

  const currentDateFormatted = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <header
      suppressHydrationWarning
      className="w-full pb-4 sm:pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0"
    >
      {/* Left: Mobile Toggle & Page Welcome Greeting matching Reference Image */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-2xl bg-white/90 border border-white text-[#7A8792] hover:text-[#29343D] shadow-2xs transition-colors shrink-0 cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="truncate">
          <h1 className="text-lg sm:text-xl font-bold text-[#29343D] tracking-tight truncate">
            {titles[activeTab].title}
          </h1>
          <p className="hidden sm:block text-xs text-[#7A8792] truncate mt-0.5">
            {titles[activeTab].subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls matching Reference Image */}
      <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 shrink-0">
        {/* Date Capsule like Reference Image */}
        <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[0_2px_12px_rgba(150,175,205,0.08)] text-xs text-[#7A8792] font-medium">
          <Calendar className="w-3.5 h-3.5 text-[#8CBCE8]" />
          <span className="font-mono text-[11px] text-[#29343D]">{currentDateFormatted} • {region}</span>
        </div>

        {/* Search Capsule like Reference Image */}
        <div className="relative w-44 sm:w-56 lg:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A8792]" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white/90 backdrop-blur-md border border-white shadow-[0_2px_12px_rgba(150,175,205,0.08)] rounded-full pl-9 pr-3.5 py-1.5 text-xs text-[#29343D] placeholder:text-[#7A8792] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#8CBCE8]/40 transition-all"
          />
        </div>

        {/* Quick Upload Action Capsule matching 'Use AI help' pill in Reference Image */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#8CBCE8] to-[#A399F0] hover:opacity-95 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(140,188,232,0.3)] transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>

        {/* Refresh Circular Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-white hover:bg-white text-[#7A8792] hover:text-[#29343D] shadow-[0_2px_12px_rgba(150,175,205,0.08)] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
          title="Refresh files"
          aria-label="Refresh data"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#8CBCE8]" : ""}`}
          />
        </button>

        {/* Notification Bell Circle like Reference Image */}
        <div className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[0_2px_12px_rgba(150,175,205,0.08)] flex items-center justify-center text-[#7A8792] cursor-pointer hover:text-[#29343D] transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#83CBA0] absolute top-2 right-2" />
        </div>

        {/* User Circle Avatar like Reference Image */}
        <div className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[0_2px_12px_rgba(150,175,205,0.08)] flex items-center justify-center text-[#29343D] font-bold text-xs cursor-pointer">
          {currentUser ? (
            <span>{(currentUser.name || currentUser.username).charAt(0).toUpperCase()}</span>
          ) : (
            <UserIcon className="w-4 h-4 text-[#7A8792]" />
          )}
        </div>
      </div>
    </header>
  );
}

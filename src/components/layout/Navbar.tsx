"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Menu,
  RefreshCw,
  Search,
  Calendar,
  User as UserIcon,
  Sparkles,
  LogOut,
  CheckCircle2,
  AlertTriangle,
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
  connectionStatus?: "connected" | "disconnected" | "checking";
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
  connectionStatus = "checking",
  currentUser,
  onLogout,
}: NavbarProps) {
  const [currentDateFormatted, setCurrentDateFormatted] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentDateFormatted(
      new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    );
  }, []);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showProfileMenu]);

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
      subtitle:
        "POSIX local disk filesystems vs. distributed Amazon S3 object storage",
    },
    system: {
      title: "System & Security Health",
      subtitle: "S3 bucket connectivity, security compliance, and team metrics",
    },
  };

  return (
    <header
      suppressHydrationWarning
      className="w-full pb-4 sm:pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0"
    >
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

      <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 shrink-0">
        {/* Date & Region Capsule */}
        <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[0_2px_12px_rgba(150,175,205,0.08)] text-xs text-[#7A8792] font-medium">
          <Calendar className="w-3.5 h-3.5 text-[#8CBCE8]" />
          <span className="font-mono text-[11px] text-[#29343D]">
            {currentDateFormatted ? `${currentDateFormatted} • ` : ""}
            {region}
          </span>
        </div>

        {/* Search Capsule */}
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

        {/* Quick Upload Action */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#8CBCE8] to-[#A399F0] hover:opacity-95 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(140,188,232,0.3)] transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-white hover:bg-white text-[#7A8792] hover:text-[#29343D] shadow-[0_2px_12px_rgba(150,175,205,0.08)] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
          title="Refresh files"
          aria-label="Refresh data"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              isRefreshing ? "animate-spin text-[#8CBCE8]" : ""
            }`}
          />
        </button>

        {/* Live S3 Status Pill */}
        <div
          className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[0_2px_12px_rgba(150,175,205,0.08)] flex items-center justify-center relative"
          title={
            connectionStatus === "connected"
              ? `S3 Connected (${region})`
              : connectionStatus === "disconnected"
              ? "S3 Disconnected"
              : "Checking S3 connection"
          }
        >
          {connectionStatus === "connected" ? (
            <CheckCircle2 className="w-4 h-4 text-[#83CBA0]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          )}
        </div>

        {/* User Avatar & Account Menu */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[0_2px_12px_rgba(150,175,205,0.08)] flex items-center justify-center text-[#29343D] font-bold text-xs cursor-pointer hover:bg-white transition-colors"
            title={
              currentUser
                ? `${currentUser.name} (${currentUser.email})`
                : "Account"
            }
            aria-label="Account menu"
          >
            {currentUser ? (
              <span>
                {(currentUser.name || currentUser.username)
                  .charAt(0)
                  .toUpperCase()}
              </span>
            ) : (
              <UserIcon className="w-4 h-4 text-[#7A8792]" />
            )}
          </button>

          {showProfileMenu && currentUser && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E3EAF0] shadow-xl p-3 z-30 space-y-2">
              <div className="pb-2 border-b border-[#E3EAF0]">
                <p className="text-xs font-bold text-[#29343D] truncate">
                  @{currentUser.username}
                </p>
                <p className="text-[11px] text-[#7A8792] truncate">
                  {currentUser.email}
                </p>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import {
  Menu,
  RefreshCw,
  Search,
  Upload,
  Shield,
  User,
  LogOut,
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
  currentUser,
  onLogout,
}: NavbarProps) {
  const titles: Record<ActiveTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: "Storage Dashboard",
      subtitle: "Overview of your files, storage allocation, and recent activity",
    },
    files: {
      title: "File Manager",
      subtitle: "Browse, filter, preview, download, and manage your cloud files",
    },
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 shrink-0">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Context */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="truncate">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              {titles[activeTab].title}
            </h1>
            <p className="hidden sm:block text-xs text-slate-500 truncate">
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-100 transition-colors"
            />
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            title="Refresh files"
            aria-label="Refresh data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-600" : ""}`}
            />
          </button>

          {/* User Profile or Admin Link */}
          {currentUser ? (
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 pl-2.5 pr-1.5 py-1 rounded-xl text-xs">
              <User className="w-3.5 h-3.5 text-sky-600" />
              <span className="font-semibold text-slate-800">{currentUser.name}</span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-1"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition-colors"
              title="Open Admin Console"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Admin</span>
            </Link>
          )}

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  Cloud,
  Upload,
  HardDrive,
  X,
  LogOut,
} from "lucide-react";
import { StorageStats } from "@/types/file";

export type ActiveTab = "dashboard" | "files";

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenUpload: () => void;
  stats: StorageStats | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { username: string; email: string; name: string } | null;
  onLogout?: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  onOpenUpload,
  stats,
  isOpen,
  onClose,
  currentUser,
  onLogout,
}: SidebarProps) {
  const navItems = [
    {
      id: "dashboard" as ActiveTab,
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: stats ? `${stats.totalFiles}` : undefined,
    },
    {
      id: "files" as ActiveTab,
      label: "File Manager",
      icon: FolderOpen,
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Structured Fixed Sidebar */}
      <aside
        suppressHydrationWarning
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight">
                CloudVault
              </span>
              <p className="text-[11px] text-slate-500">Cloud Storage</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="p-4 shrink-0">
          <button
            onClick={() => {
              onOpenUpload();
              if (isOpen) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (isOpen) onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-sky-50 text-sky-700 border border-sky-200/80 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-sky-600" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Clean Storage Usage Widget (No raw S3 bucket jargon) */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <HardDrive className="w-3.5 h-3.5 text-sky-600" />
              Storage Used
            </span>
            <span className="font-mono text-xs font-semibold text-slate-900">
              {stats?.totalSizeFormatted || "0 B"}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-300"
              style={{
                width: stats && stats.totalSizeBytes > 0 ? "24%" : "0%",
              }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            {stats?.totalFiles ?? 0} active object{(stats?.totalFiles ?? 0) === 1 ? "" : "s"} stored
          </p>
        </div>

        {/* User Session Footer */}
        {currentUser && (
          <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {currentUser.name || currentUser.username}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

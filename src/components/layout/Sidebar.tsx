"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  Cloud,
  Layers,
  Upload,
  HardDrive,
  Server,
  X,
  ShieldCheck,
  Shield,
} from "lucide-react";
import { StorageStats } from "@/types/file";
import { ActiveTab, DEFAULT_BUCKET_NAME, DEFAULT_AWS_REGION } from "@/lib/constants";

export { type ActiveTab };

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenUpload: () => void;
  stats: StorageStats | null;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  onOpenUpload,
  stats,
  isOpen,
  onClose,
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
    {
      id: "cloud-concepts" as ActiveTab,
      label: "Cloud vs Local",
      icon: Layers,
    },
    {
      id: "system" as ActiveTab,
      label: "Bucket Health",
      icon: Server,
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Structured Fixed Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-white tracking-tight">
                  CloudVault
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                  S3
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Cloud Storage SaaS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Navigation
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-slate-800 text-sky-400 border border-slate-700/80"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-sky-400" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-2">
            <Link
              href="/admin"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-sky-400" />
                <span>Admin Portal</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">
                /admin
              </span>
            </Link>
          </div>
        </nav>

        {/* Active AWS S3 Bucket Card */}
        <div className="p-3.5 border-t border-slate-800 shrink-0">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
                <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                S3 Bucket
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Private
              </span>
            </div>
            <div className="font-mono text-slate-200 bg-slate-900/90 px-2 py-1 rounded border border-slate-700/60 truncate text-[11px]">
              {stats?.bucketName || DEFAULT_BUCKET_NAME}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Region:</span>
              <span className="font-mono text-slate-300">
                {stats?.region || DEFAULT_AWS_REGION}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Used:</span>
              <span className="font-mono text-sky-300 font-semibold">
                {stats?.totalSizeFormatted || "0 B"}
              </span>
            </div>
          </div>
        </div>

        {/* System Info Footer */}
        <div className="px-5 py-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            AWS SDK v3
          </span>
          <span className="font-mono text-slate-400">Next.js 16</span>
        </div>
      </aside>
    </>
  );
}

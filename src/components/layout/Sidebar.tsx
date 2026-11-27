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
  Layers,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { StorageStats } from "@/types/file";

export type ActiveTab = "dashboard" | "files" | "cloud-concepts" | "system";

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
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "files" as ActiveTab,
      label: "Files & Storage",
      icon: FolderOpen,
      badge: stats ? `${stats.totalFiles}` : undefined,
    },
    {
      id: "cloud-concepts" as ActiveTab,
      label: "Architecture",
      icon: Layers,
    },
    {
      id: "system" as ActiveTab,
      label: "System Health",
      icon: ShieldCheck,
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-5">
      {/* Top Branding Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#E3EAF0] shadow-[0_4px_16px_rgba(150,175,205,0.18)] flex items-center justify-center text-[#29343D] group-hover:scale-105 transition-transform">
              <Cloud className="w-5 h-5 text-[#8CBCE8]" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-[#29343D] tracking-tight">
                CloudVault
              </span>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#7A8792]">
                SaaS Storage
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl text-[#7A8792] hover:text-[#29343D] hover:bg-white/60 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action */}
        <button
          onClick={() => {
            onOpenUpload();
            if (isOpen) onClose();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#8CBCE8] to-[#A399F0] hover:opacity-95 active:scale-[0.99] text-white text-xs font-semibold shadow-[0_4px_14px_rgba(140,188,232,0.35)] transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Files</span>
        </button>

        {/* Navigation Items Matching Reference Image */}
        <nav className="space-y-1.5 pt-2">
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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-white border border-[#E3EAF0] shadow-[0_4px_16px_rgba(150,175,205,0.12)] text-[#29343D] font-bold"
                    : "text-[#7A8792] hover:text-[#29343D] hover:bg-white/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-[#29343D]" : "text-[#7A8792]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E6E1FA] text-[#29343D] border border-white font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls Matching Reference Image (Settings, Logout, Storage & User) */}
      <div className="space-y-4 pt-6 border-t border-[#E3EAF0]/60">
        {/* Storage Mini Bar */}
        <div className="p-3.5 rounded-2xl bg-white/70 border border-[#E3EAF0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7A8792]">
              <HardDrive className="w-3.5 h-3.5 text-[#8CBCE8]" />
              Storage Used
            </span>
            <span className="font-mono text-xs font-bold text-[#29343D]">
              {stats?.totalSizeFormatted || "0 B"}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#E3EAF0] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8CBCE8] via-[#83CBA0] to-[#A399F0] rounded-full transition-all duration-300"
              style={{
                width: `${
                  stats && stats.totalSizeBytes > 0
                    ? Math.min(
                        100,
                        Math.max(4, (stats.totalSizeBytes / (1024 * 1024 * 1024)) * 100)
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[10px] text-[#7A8792]">
            {stats?.totalFiles ?? 0} active objects • 1 GB workspace ref
          </p>
        </div>

        {/* Settings & Logout Links like Reference Image */}
        <div className="space-y-1">
          <button
            onClick={() => {
              onSelectTab("system");
              if (isOpen) onClose();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-medium text-[#7A8792] hover:text-[#29343D] hover:bg-white/60 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-[#7A8792]" />
            <span>Settings</span>
          </button>

          {currentUser && onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-medium text-[#7A8792] hover:text-rose-600 hover:bg-rose-50/60 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#7A8792]" />
              <span>Log Out</span>
            </button>
          )}
        </div>

        {/* User Profile Capsule */}
        {currentUser && (
          <div className="pt-2 flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D8EEFF] to-[#E6E1FA] border border-white text-[#29343D] font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
              {currentUser.name?.charAt(0).toUpperCase() || currentUser.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#29343D] truncate">
                {currentUser.name || currentUser.username}
              </p>
              <p className="text-[10px] text-[#7A8792] truncate">
                {currentUser.email}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#29343D]/20 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Desktop In-Container Sidebar matching Reference Image */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/90 backdrop-blur-xl rounded-[28px] border border-white shadow-[0_8px_30px_rgba(150,175,205,0.12)] shrink-0 self-stretch overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      <aside
        suppressHydrationWarning
        className={`fixed top-4 bottom-4 left-4 z-50 w-72 bg-white/95 backdrop-blur-2xl rounded-[28px] border border-white shadow-2xl transition-transform duration-200 ease-in-out lg:hidden overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-[120%]"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  Sidebar,
  Navbar,
  StatsCards,
  StorageBreakdown,
  FileList,
  FileGrid,
  UploadModal,
  FilePreviewModal,
  DeleteConfirmModal,
  ToastContainer,
  ToastMessage,
  ActiveTab,
  CloudVsLocalSection,
  SystemHealthSection,
} from "@/components";
import { FILE_CATEGORIES } from "@/lib/constants";
import { downloadCloudFile } from "@/lib/clientDownload";
import { S3FileItem, StorageStats, FileCategory } from "@/types/file";

export default function UserDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // User auth state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    email: string;
    name: string;
  } | null>(null);

  // Data states
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [files, setFiles] = useState<S3FileItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "checking"
  >("checking");
  const [connectionMessage, setConnectionMessage] = useState<string | undefined>(
    undefined
  );
  const [databaseConnected, setDatabaseConnected] = useState<boolean | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters and Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<FileCategory | "all">(
    "all"
  );
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<S3FileItem | null>(null);
  const [deleteTargetFile, setDeleteTargetFile] = useState<S3FileItem | null>(
    null
  );

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (toast: {
      type: "success" | "error" | "info";
      title: string;
      message?: string;
    }) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, ...toast }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearLocalSession = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("cloudvault_user");
      localStorage.removeItem("cloudvault_uploader_name");
    }
    setCurrentUser(null);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, filesRes, healthRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/files"),
        fetch("/api/health"),
      ]);

      if (statsRes.status === 401 || filesRes.status === 401) {
        clearLocalSession();
        router.replace("/");
        return;
      }

      const [statsData, filesData, healthData] = await Promise.all([
        statsRes.json().catch(() => ({})),
        filesRes.json().catch(() => ({})),
        healthRes.json().catch(() => ({})),
      ]);

      if (statsData.stats) {
        setStats(statsData.stats);
      }
      if (!statsRes.ok && statsData.error) {
        addToast({
          type: "error",
          title: "Storage Metrics Warning",
          message: statsData.error,
        });
      }

      if (filesRes.ok && filesData.success && Array.isArray(filesData.files)) {
        setFiles(filesData.files);
      } else if (!filesRes.ok && filesData.error) {
        addToast({
          type: "error",
          title: "Could Not Load Files",
          message: filesData.error,
        });
      }

      setConnectionStatus(
        healthData.connected ? "connected" : "disconnected"
      );
      setConnectionMessage(healthData.message);
      if (typeof healthData.databaseConnected === "boolean") {
        setDatabaseConnected(healthData.databaseConnected);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setConnectionStatus("disconnected");
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to communicate with CloudVault backend services.",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast, clearLocalSession, router]);

  // Enforce verified server session before loading dashboard
  useEffect(() => {
    let active = true;

    async function verifyAndLoad() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!active) return;

        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          if (typeof window !== "undefined") {
            localStorage.setItem("cloudvault_user", JSON.stringify(data.user));
            localStorage.setItem(
              "cloudvault_uploader_name",
              data.user.name || data.user.username
            );
          }
          setIsCheckingAuth(false);
          await fetchData();
        } else {
          clearLocalSession();
          router.replace("/");
        }
      } catch {
        if (!active) return;
        clearLocalSession();
        router.replace("/");
      }
    }

    verifyAndLoad();
    return () => {
      active = false;
    };
  }, [clearLocalSession, fetchData, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearLocalSession();
    router.push("/");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    addToast({
      type: "info",
      title: "Data Synced",
      message: "Refreshed cloud storage files and storage metrics.",
    });
  };

  const processedFiles = useMemo(() => {
    let result = [...files];

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.originalName.toLowerCase().includes(lower) ||
          f.key.toLowerCase().includes(lower)
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((f) => f.category === categoryFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.originalName.localeCompare(b.originalName);
      } else if (sortBy === "size") {
        cmp = a.size - b.size;
      } else {
        cmp =
          new Date(a.lastModified).getTime() -
          new Date(b.lastModified).getTime();
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [files, searchTerm, categoryFilter, sortBy, sortOrder]);

  const handleDownload = async (file: S3FileItem) => {
    const result = await downloadCloudFile(file);
    if (result.ok) {
      addToast({
        type: "info",
        title: "Download Initiated",
        message: `Fetching "${file.originalName}" from cloud storage.`,
      });
      return;
    }

    if (result.status === 401) {
      clearLocalSession();
      router.replace("/");
      return;
    }

    addToast({
      type: "error",
      title: "Download Failed",
      message: result.error,
    });
  };

  const handleDeleteConfirm = async (file: S3FileItem): Promise<boolean> => {
    try {
      const res = await fetch(
        `/api/files?key=${encodeURIComponent(file.key)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        clearLocalSession();
        router.replace("/");
        return true;
      }

      if (res.ok && data.success) {
        addToast({
          type: "success",
          title: "File Deleted",
          message: `"${file.originalName}" permanently removed from your vault.`,
        });
        await fetchData();
        return true;
      }

      addToast({
        type: "error",
        title: "Deletion Failed",
        message: data.error || "Could not delete file from cloud storage.",
      });
      return false;
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to connect to delete endpoint.",
      });
      return false;
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-reference-canvas bg-grid-mesh flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-[#718096] bg-white/80 backdrop-blur-xl px-8 py-6 rounded-3xl border border-white shadow-lg">
          <RefreshCw className="w-7 h-7 animate-spin text-[#78BCE8]" />
          <p className="text-xs font-semibold text-[#29343D]">
            Verifying your CloudVault session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-reference-canvas bg-grid-mesh p-3 sm:p-5 lg:p-7 flex items-center justify-center font-sans antialiased"
      suppressHydrationWarning
    >
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="w-full max-w-[1600px] bg-white/70 backdrop-blur-2xl rounded-[36px] border border-white/80 shadow-[0_20px_60px_-15px_rgba(32,50,90,0.07)] p-4 sm:p-6 lg:p-7 flex flex-col lg:flex-row gap-6 min-h-[92vh]">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenUpload={() => setIsUploadOpen(true)}
          stats={stats}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            activeTab={activeTab}
            onToggleSidebar={() => setSidebarOpen(true)}
            onOpenUpload={() => setIsUploadOpen(true)}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            searchTerm={searchTerm}
            onSearchChange={(val) => {
              setSearchTerm(val);
              if (val.trim() && activeTab !== "files") {
                setActiveTab("files");
              }
            }}
            region={stats?.region || "ap-south-1"}
            connectionStatus={connectionStatus}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          <main className="flex-1 w-full space-y-6">
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <StatsCards
                  stats={stats}
                  isLoading={isLoading}
                  onViewFiles={() => setActiveTab("files")}
                  onOpenUpload={() => setIsUploadOpen(true)}
                  onViewArchitecture={() => setActiveTab("cloud-concepts")}
                  onViewSecurity={() => setActiveTab("system")}
                />

                <StorageBreakdown
                  stats={stats}
                  onFilterCategory={(cat) => {
                    setCategoryFilter(cat);
                    setActiveTab("files");
                  }}
                  onViewAllFiles={() => setActiveTab("files")}
                />

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white border border-[#E3EAF0] flex items-center justify-center text-[#29343D] shadow-2xs">
                        <Clock className="w-4 h-4 text-[#8CBCE8]" />
                      </div>
                      <h2 className="text-base font-bold text-[#29343D] tracking-tight">
                        Recent Uploads
                      </h2>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center bg-white/90 backdrop-blur-md border border-white rounded-full p-1 shadow-[0_2px_12px_rgba(150,175,205,0.08)]">
                        <button
                          onClick={() => setViewMode("table")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            viewMode === "table"
                              ? "bg-white text-[#29343D] shadow-2xs border border-[#E3EAF0]"
                              : "text-[#7A8792] hover:text-[#29343D]"
                          }`}
                          title="List View"
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>List</span>
                        </button>
                        <button
                          onClick={() => setViewMode("grid")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            viewMode === "grid"
                              ? "bg-white text-[#29343D] shadow-2xs border border-[#E3EAF0]"
                              : "text-[#7A8792] hover:text-[#29343D]"
                          }`}
                          title="Grid View"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>Grid</span>
                        </button>
                      </div>

                      {files.length > 6 && (
                        <button
                          onClick={() => setActiveTab("files")}
                          className="text-xs font-semibold text-[#20628E] hover:text-[#8CBCE8] transition-colors cursor-pointer"
                        >
                          View all {files.length} files →
                        </button>
                      )}
                    </div>
                  </div>

                  {viewMode === "table" ? (
                    <FileList
                      files={files.slice(0, 6)}
                      isLoading={isLoading}
                      onPreview={(f) => setPreviewFile(f)}
                      onDownload={handleDownload}
                      onDelete={(f) => setDeleteTargetFile(f)}
                      onOpenUpload={() => setIsUploadOpen(true)}
                      currentUsername={
                        currentUser?.username || currentUser?.name
                      }
                      currentUserAliases={
                        currentUser
                          ? [currentUser.username, currentUser.name]
                          : []
                      }
                    />
                  ) : (
                    <FileGrid
                      files={files.slice(0, 6)}
                      isLoading={isLoading}
                      onPreview={(f) => setPreviewFile(f)}
                      onDownload={handleDownload}
                      onDelete={(f) => setDeleteTargetFile(f)}
                      onOpenUpload={() => setIsUploadOpen(true)}
                      currentUsername={
                        currentUser?.username || currentUser?.name
                      }
                      currentUserAliases={
                        currentUser
                          ? [currentUser.username, currentUser.name]
                          : []
                      }
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab === "files" && (
              <div className="space-y-4">
                <div className="p-4 rounded-3xl bg-white/90 backdrop-blur-md border border-white shadow-[0_4px_20px_rgba(150,175,205,0.08)] space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A8792]" />
                      <input
                        type="text"
                        placeholder="Search files by name or object key..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#F6F9FC] border border-[#E3EAF0] rounded-full pl-9 pr-4 py-2 text-xs text-[#29343D] placeholder:text-[#7A8792] focus:outline-none focus:bg-white focus:border-[#8CBCE8] focus:ring-2 focus:ring-[#D8EEFF] transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-[#F6F9FC] border border-[#E3EAF0] rounded-full px-3 py-1.5 text-xs text-[#29343D]">
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#7A8792] mr-1.5" />
                        <select
                          value={sortBy}
                          onChange={(e) =>
                            setSortBy(
                              e.target.value as "date" | "name" | "size"
                            )
                          }
                          className="bg-transparent text-[#29343D] focus:outline-none cursor-pointer text-xs"
                        >
                          <option value="date">Date</option>
                          <option value="name">Name</option>
                          <option value="size">Size</option>
                        </select>
                        <button
                          onClick={() =>
                            setSortOrder((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            )
                          }
                          className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#E3EAF0] text-[#29343D] hover:bg-[#D8EEFF] font-semibold cursor-pointer transition-colors"
                          title="Toggle sort direction"
                        >
                          {sortOrder.toUpperCase()}
                        </button>
                      </div>

                      <div className="flex items-center bg-[#F6F9FC] border border-[#E3EAF0] rounded-full p-1 shadow-2xs">
                        <button
                          onClick={() => setViewMode("table")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            viewMode === "table"
                              ? "bg-white text-[#29343D] shadow-2xs border border-[#E3EAF0]"
                              : "text-[#7A8792] hover:text-[#29343D]"
                          }`}
                          title="List View"
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>List</span>
                        </button>
                        <button
                          onClick={() => setViewMode("grid")}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            viewMode === "grid"
                              ? "bg-white text-[#29343D] shadow-2xs border border-[#E3EAF0]"
                              : "text-[#7A8792] hover:text-[#29343D]"
                          }`}
                          title="Grid View"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>Grid</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                    {FILE_CATEGORIES.map((cat) => {
                      const isSelected = categoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategoryFilter(cat.id)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#D8EEFF] text-[#20628E] border border-[#8CBCE8]/50 shadow-2xs"
                              : "bg-[#F6F9FC] text-[#7A8792] hover:text-[#29343D] hover:bg-[#E3EAF0]/60 border border-[#E3EAF0]"
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#7A8792] px-1">
                  <span>
                    Showing {processedFiles.length} of {files.length} file(s)
                  </span>
                  {(searchTerm || categoryFilter !== "all") && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setCategoryFilter("all");
                      }}
                      className="text-[#20628E] hover:text-[#8CBCE8] font-medium transition-colors cursor-pointer"
                    >
                      Reset filters
                    </button>
                  )}
                </div>

                {viewMode === "table" ? (
                  <FileList
                    files={processedFiles}
                    isLoading={isLoading}
                    onPreview={(f) => setPreviewFile(f)}
                    onDownload={handleDownload}
                    onDelete={(f) => setDeleteTargetFile(f)}
                    onOpenUpload={() => setIsUploadOpen(true)}
                    currentUsername={
                      currentUser?.username || currentUser?.name
                    }
                    currentUserAliases={
                      currentUser
                        ? [currentUser.username, currentUser.name]
                        : []
                    }
                  />
                ) : (
                  <FileGrid
                    files={processedFiles}
                    isLoading={isLoading}
                    onPreview={(f) => setPreviewFile(f)}
                    onDownload={handleDownload}
                    onDelete={(f) => setDeleteTargetFile(f)}
                    onOpenUpload={() => setIsUploadOpen(true)}
                    currentUsername={
                      currentUser?.username || currentUser?.name
                    }
                    currentUserAliases={
                      currentUser
                        ? [currentUser.username, currentUser.name]
                        : []
                    }
                  />
                )}
              </div>
            )}

            {activeTab === "cloud-concepts" && <CloudVsLocalSection />}

            {activeTab === "system" && (
              <SystemHealthSection
                stats={stats}
                connectionStatus={connectionStatus}
                connectionMessage={connectionMessage}
                databaseConnected={databaseConnected}
                onCheckHealth={fetchData}
              />
            )}
          </main>
        </div>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchData}
        onAddToast={addToast}
        currentUsername={currentUser?.name || currentUser?.username}
      />

      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      <DeleteConfirmModal
        file={deleteTargetFile}
        isOpen={Boolean(deleteTargetFile)}
        onClose={() => setDeleteTargetFile(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  Clock,
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
} from "@/components";
import { FILE_CATEGORIES } from "@/lib/constants";
import { S3FileItem, StorageStats, FileCategory } from "@/types/file";

export default function UserDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // User state
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    email: string;
    name: string;
  } | null>(null);

  // Data states
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [files, setFiles] = useState<S3FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters and Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<FileCategory | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<S3FileItem | null>(null);
  const [deleteTargetFile, setDeleteTargetFile] = useState<S3FileItem | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (toast: { type: "success" | "error" | "info"; title: string; message?: string }) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, ...toast }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check authentication
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("cloudvault_user", JSON.stringify(data.user));
          localStorage.setItem("cloudvault_uploader_name", data.user.name || data.user.username);
        }
      } else if (typeof window !== "undefined") {
        const saved = localStorage.getItem("cloudvault_user");
        if (saved) {
          try {
            setCurrentUser(JSON.parse(saved));
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch Stats & Files
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, filesRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/files"),
      ]);

      const statsData = await statsRes.json();
      const filesData = await filesRes.json();

      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
      }

      if (filesData.success && filesData.files) {
        setFiles(filesData.files);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkAuth();
    fetchData();
  }, [checkAuth, fetchData]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("cloudvault_user");
    }
    setCurrentUser(null);
    router.push("/");
  };

  // Handle Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    addToast({
      type: "info",
      title: "Data Synced",
      message: "Refreshed cloud storage files.",
    });
  };

  // Filtered and Sorted Files
  const processedFiles = useMemo(() => {
    let result = [...files];

    // Search filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.originalName.toLowerCase().includes(lower) ||
          f.key.toLowerCase().includes(lower)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((f) => f.category === categoryFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.originalName.localeCompare(b.originalName);
      } else if (sortBy === "size") {
        cmp = a.size - b.size;
      } else {
        cmp =
          new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [files, searchTerm, categoryFilter, sortBy, sortOrder]);

  // File Actions
  const handleDownload = (file: S3FileItem) => {
    const downloadUrl = `/api/files/download?key=${encodeURIComponent(
      file.key
    )}&name=${encodeURIComponent(file.originalName)}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = file.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addToast({
      type: "info",
      title: "Download Initiated",
      message: `Fetching "${file.originalName}" from cloud storage.`,
    });
  };

  const handleDeleteConfirm = async (file: S3FileItem) => {
    try {
      const res = await fetch(
        `/api/files?key=${encodeURIComponent(file.key)}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        addToast({
          type: "success",
          title: "File Deleted",
          message: `"${file.originalName}" permanently removed.`,
        });
        await fetchData();
      } else {
        addToast({
          type: "error",
          title: "Deletion Failed",
          message: data.error || "Could not delete file from cloud storage.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to connect to delete endpoint.",
      });
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 flex"
      suppressHydrationWarning
    >
      {/* Toast System */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar Navigation */}
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

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Navbar */}
        <Navbar
          activeTab={activeTab}
          onToggleSidebar={() => setSidebarOpen(true)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          region={stats?.region || "ap-south-1"}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Content View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full space-y-6 max-w-7xl mx-auto">
          {/* TAB: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Stat Cards - Clean, Focused, No Bloat */}
              <StatsCards
                stats={stats}
                isLoading={isLoading}
                onViewFiles={() => setActiveTab("files")}
                onOpenUpload={() => setIsUploadOpen(true)}
              />

              {/* Storage Category Distribution */}
              <StorageBreakdown
                stats={stats}
                onFilterCategory={(cat) => {
                  setCategoryFilter(cat);
                  setActiveTab("files");
                }}
              />

              {/* Recent Uploads Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-sky-600" />
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      Recent Uploads
                    </h2>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* View Switch: List / Grid */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                      <button
                        onClick={() => setViewMode("table")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          viewMode === "table"
                            ? "bg-slate-100 text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        title="List View"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>List</span>
                      </button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          viewMode === "grid"
                            ? "bg-slate-100 text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
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
                        className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
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
                  />
                ) : (
                  <FileGrid
                    files={files.slice(0, 6)}
                    isLoading={isLoading}
                    onPreview={(f) => setPreviewFile(f)}
                    onDownload={handleDownload}
                    onDelete={(f) => setDeleteTargetFile(f)}
                    onOpenUpload={() => setIsUploadOpen(true)}
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB: ALL FILES */}
          {activeTab === "files" && (
            <div className="space-y-4">
              {/* Filter & Search Toolbar */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                {/* Search & Actions Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search files by name or object key..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-100 transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Sort Dropdown */}
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                      <select
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(e.target.value as "date" | "name" | "size")
                        }
                        className="bg-transparent text-slate-800 focus:outline-none cursor-pointer text-xs"
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
                        className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold cursor-pointer"
                        title="Toggle sort direction"
                      >
                        {sortOrder.toUpperCase()}
                      </button>
                    </div>

                    {/* View Switch: List / Grid */}
                    <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                      <button
                        onClick={() => setViewMode("table")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          viewMode === "table"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        title="List View"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>List</span>
                      </button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          viewMode === "grid"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        title="Grid View"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Grid</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                  {FILE_CATEGORIES.map((cat) => {
                    const isSelected = categoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? "bg-sky-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Results Summary */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Showing {processedFiles.length} of {files.length} file(s)
                </span>
                {(searchTerm || categoryFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryFilter("all");
                    }}
                    className="text-sky-600 hover:text-sky-700 font-medium transition-colors cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              {/* View Rendering */}
              {viewMode === "table" ? (
                <FileList
                  files={processedFiles}
                  isLoading={isLoading}
                  onPreview={(f) => setPreviewFile(f)}
                  onDownload={handleDownload}
                  onDelete={(f) => setDeleteTargetFile(f)}
                  onOpenUpload={() => setIsUploadOpen(true)}
                />
              ) : (
                <FileGrid
                  files={processedFiles}
                  isLoading={isLoading}
                  onPreview={(f) => setPreviewFile(f)}
                  onDownload={handleDownload}
                  onDelete={(f) => setDeleteTargetFile(f)}
                  onOpenUpload={() => setIsUploadOpen(true)}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchData}
        onAddToast={addToast}
        currentUsername={currentUser?.name || currentUser?.username}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        file={deleteTargetFile}
        isOpen={Boolean(deleteTargetFile)}
        onClose={() => setDeleteTargetFile(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}


"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  HardDrive,
  Files,
  Database,
  Lock,
  Eye,
  EyeOff,
  Download,
  Trash2,
  RefreshCw,
  Search,
  ArrowLeft,
  LogOut,
  FolderOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  FileQuestion,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { CloudUser, S3FileItem } from "@/types/file";
import { FileIcon } from "@/components/files/FileIcon";
import { FilePreviewModal } from "@/components/modals/FilePreviewModal";
import { ToastContainer, ToastMessage } from "@/components/ui/Toast";
import { formatBytes, formatDate, formatRelativeTime } from "@/lib/utils";

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("admin");
  const [passwordInput, setPasswordInput] = useState("Adamas@2023");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Data state
  const [users, setUsers] = useState<CloudUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<CloudUser | null>(null);
  const [userFiles, setUserFiles] = useState<S3FileItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingUserFiles, setIsLoadingUserFiles] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchUserTerm, setSearchUserTerm] = useState("");
  const [searchFileTerm, setSearchFileTerm] = useState("");

  // Modals & Action Targets
  const [previewFile, setPreviewFile] = useState<S3FileItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<{ file: S3FileItem; userName: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<CloudUser | null>(null);
  const [isDeletingAction, setIsDeletingAction] = useState(false);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalObjects: 0,
    totalStorageBytes: 0,
    totalStorageFormatted: "0 B",
    databaseStatus: "checking",
  });

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

  // Check auth on mount
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth");
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  // Fetch admin users data
  const fetchAdminData = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();

      if (res.ok && data.success) {
        setUsers(data.users || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      } else if (res.status === 401) {
        setIsAuthenticated(false);
      } else {
        addToast({
          type: "error",
          title: "Data Fetch Error",
          message: data.error || "Could not fetch user records.",
        });
      }
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setIsLoadingUsers(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // When authenticated, fetch data
  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
    }
  }, [isAuthenticated, fetchAdminData]);

  // Fetch files for a specific user
  const fetchUserFiles = useCallback(async (userName: string) => {
    try {
      setIsLoadingUserFiles(true);
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(userName)}/files`
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setUserFiles(data.files || []);
      } else {
        addToast({
          type: "error",
          title: "User Files Error",
          message: data.error || "Could not fetch user's uploaded objects.",
        });
      }
    } catch (err) {
      console.error("Error fetching user files:", err);
    } finally {
      setIsLoadingUserFiles(false);
    }
  }, [addToast]);

  // Select user to inspect their objects
  const handleSelectUser = (user: CloudUser) => {
    setSelectedUser(user);
    setSearchFileTerm("");
    fetchUserFiles(user.name);
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        addToast({
          type: "success",
          title: "Admin Access Granted",
          message: "Authenticated with MongoDB administrator credentials.",
        });
      } else {
        setLoginError(data.error || "Invalid username or password.");
      }
    } catch {
      setLoginError("Failed to connect to authentication endpoint.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      setIsAuthenticated(false);
      setSelectedUser(null);
      setUserFiles([]);
      addToast({
        type: "info",
        title: "Logged Out",
        message: "Admin session terminated.",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Download user file
  const handleDownloadFile = (file: S3FileItem) => {
    const downloadUrl = `/api/files/download?key=${encodeURIComponent(
      file.key
    )}&name=${encodeURIComponent(file.originalName)}`;
    window.location.href = downloadUrl;
    addToast({
      type: "info",
      title: "Download Initiated",
      message: `Fetching "${file.originalName}" from Amazon S3.`,
    });
  };

  // Delete single user object
  const handleConfirmDeleteObject = async () => {
    if (!fileToDelete) return;

    try {
      setIsDeletingAction(true);
      const { file, userName } = fileToDelete;
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(userName)}/files?key=${encodeURIComponent(file.key)}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        addToast({
          type: "success",
          title: "Object Deleted",
          message: `Permanently removed "${file.originalName}" from S3 and MongoDB.`,
        });
        setFileToDelete(null);
        // Refresh current user files & master users list
        await fetchUserFiles(userName);
        await fetchAdminData();
      } else {
        addToast({
          type: "error",
          title: "Deletion Failed",
          message: data.error || "Could not delete object.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to connect to delete endpoint.",
      });
    } finally {
      setIsDeletingAction(false);
    }
  };

  // Delete entire user and all their objects
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeletingAction(true);
      const res = await fetch(
        `/api/admin/users?userName=${encodeURIComponent(userToDelete.name)}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        addToast({
          type: "success",
          title: "User Removed",
          message: `User "${userToDelete.name}" and all uploaded objects were permanently removed.`,
        });
        setUserToDelete(null);
        if (selectedUser?.name === userToDelete.name) {
          setSelectedUser(null);
          setUserFiles([]);
        }
        await fetchAdminData();
      } else {
        addToast({
          type: "error",
          title: "Deletion Failed",
          message: data.error || "Could not delete user.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to delete user records.",
      });
    } finally {
      setIsDeletingAction(false);
    }
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    if (!searchUserTerm.trim()) return users;
    const lower = searchUserTerm.toLowerCase().trim();
    return users.filter((u) => u.name.toLowerCase().includes(lower));
  }, [users, searchUserTerm]);

  // Filtered user files
  const filteredUserFiles = useMemo(() => {
    if (!searchFileTerm.trim()) return userFiles;
    const lower = searchFileTerm.toLowerCase().trim();
    return userFiles.filter(
      (f) =>
        f.originalName.toLowerCase().includes(lower) ||
        f.key.toLowerCase().includes(lower)
    );
  }, [userFiles, searchFileTerm]);

  // 1. Loading Authentication Check
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
          <p className="text-xs">Verifying CloudVault Admin session...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render Admin Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        <div className="w-full max-w-md space-y-6">
          {/* Header Brand */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto text-sky-400 shadow-lg">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              CloudVault Admin Portal
            </h1>
            <p className="text-xs text-slate-400">
              MongoDB Database & Multi-User Cloud Object Management
            </p>
          </div>

          {/* Login Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Administrator Authentication
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Database className="w-3 h-3" />
                MongoDB Atlas
              </span>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Admin Username
                </label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Academic Evaluation Credential:</span>
                </div>
                <p>
                  Password is stored and verified via MongoDB:{" "}
                  <code className="text-sky-300 font-mono bg-slate-900 px-1 py-0.5 rounded border border-slate-700">
                    Adamas@2023
                  </code>
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying with MongoDB...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Login as Administrator</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Back to Client App */}
          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Storage Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated: Render Admin Dashboard
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Admin Top Navigation */}
      <header className="sticky top-0 z-30 w-full bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title="Return to Main Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    CloudVault Admin Console
                  </h1>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                    viva-eval
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  User object oversight, storage quotas & direct Amazon S3 file management
                </p>
              </div>
            </div>
          </div>

          {/* Right Admin Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* MongoDB status badge */}
            <span className="hidden sm:flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 text-xs font-medium">
              <Database className="w-3.5 h-3.5" />
              <span>MongoDB Connected</span>
            </span>

            {/* Refresh */}
            <button
              onClick={() => {
                setIsRefreshing(true);
                fetchAdminData();
                if (selectedUser) {
                  fetchUserFiles(selectedUser.name);
                }
              }}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh users and objects"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-400" : ""}`}
              />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Users
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-white font-mono">
                {isLoadingUsers ? "..." : metrics.totalUsers}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Registered in MongoDB database
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
              Database: cloudvault
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                User Objects Uploaded
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Files className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-white font-mono">
                {isLoadingUsers ? "..." : metrics.totalObjects}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Active objects stored in Amazon S3
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
              Prefix: uploads/*
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Storage Consumed
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-white font-mono truncate">
                {isLoadingUsers ? "..." : metrics.totalStorageFormatted}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {(metrics.totalStorageBytes || 0).toLocaleString()} bytes
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
              Bucket: tushardevx01
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Security & Isolation
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-base font-bold text-emerald-400 font-mono">
                Admin Authorized
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Role: Super Administrator
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono truncate">
              Signed Session Token
            </div>
          </div>
        </div>

        {/* Workspace Layout: Left Users List | Right User Objects Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* USERS LIST (Left Column: 5 Cols on desktop) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>User Accounts</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Showing {filteredUsers.length} user(s) with object metrics
                  </p>
                </div>
              </div>

              {/* User search bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user by name..."
                  value={searchUserTerm}
                  onChange={(e) => setSearchUserTerm(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Users List */}
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {isLoadingUsers ? (
                  [...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 animate-pulse space-y-2"
                    >
                      <div className="h-4 bg-slate-800 rounded w-1/3" />
                      <div className="h-3 bg-slate-800 rounded w-2/3" />
                    </div>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-800/30 border border-slate-800 text-xs text-slate-400">
                    No users matching search query.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUser?.name === u.name;
                    return (
                      <div
                        key={u.name}
                        onClick={() => handleSelectUser(u)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected
                            ? "bg-slate-800 border-sky-500/60 shadow-md ring-1 ring-sky-500/30"
                            : "bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center font-bold text-sky-400 text-sm">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">
                                {u.name}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Last active: {formatRelativeTime(u.lastActiveAt || u.createdAt)}
                              </p>
                            </div>
                          </div>

                          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                            <Files className="w-3 h-3" />
                            <span>{u.objectCount} obj</span>
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            Total Space:{" "}
                            <strong className="text-slate-200 font-mono">
                              {u.totalSizeFormatted || formatBytes(u.totalSizeBytes)}
                            </strong>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectUser(u);
                              }}
                              className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-0.5 transition-colors"
                            >
                              <span>Inspect</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserToDelete(u);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                              title={`Delete user ${u.name} and all files`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* USER OBJECTS INSPECTOR (Right Column: 7 Cols on desktop) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 min-h-[500px]">
              {selectedUser ? (
                <>
                  {/* Selected User Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-base">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-white tracking-tight">
                            {selectedUser.name}&apos;s Uploaded Objects
                          </h2>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {filteredUserFiles.length} file(s)
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Total Storage Used:{" "}
                          <span className="font-mono text-sky-400 font-semibold">
                            {selectedUser.totalSizeFormatted || formatBytes(selectedUser.totalSizeBytes)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors self-start sm:self-auto"
                      title="Close user details"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Filter inside selected user files */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter objects by filename or key..."
                        value={searchFileTerm}
                        onChange={(e) => setSearchFileTerm(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* User Files List / Table */}
                  {isLoadingUserFiles ? (
                    <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                      <p className="text-xs">Loading objects from Amazon S3 & MongoDB...</p>
                    </div>
                  ) : filteredUserFiles.length === 0 ? (
                    <div className="py-16 text-center rounded-2xl bg-slate-800/30 border border-slate-800 p-6 space-y-2">
                      <FileQuestion className="w-8 h-8 text-slate-500 mx-auto" />
                      <h3 className="text-sm font-semibold text-white">
                        No uploaded objects found
                      </h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        This user does not have any objects currently stored in the Amazon S3 bucket.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {filteredUserFiles.map((file) => {
                        const isPreviewable =
                          file.category === "image" ||
                          file.originalName.toLowerCase().endsWith(".pdf") ||
                          file.category === "code";

                        return (
                          <div
                            key={file.key}
                            className="p-3.5 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 shrink-0">
                                <FileIcon
                                  category={file.category}
                                  mimeType={file.contentType}
                                  className="w-4 h-4"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white text-xs truncate group-hover:text-sky-300 transition-colors">
                                  {file.originalName}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                                  <span>{formatBytes(file.size)}</span>
                                  <span>•</span>
                                  <span className="capitalize">{file.category}</span>
                                  <span>•</span>
                                  <span>{formatRelativeTime(file.lastModified)}</span>
                                </div>
                                <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                                  {file.key}
                                </p>
                              </div>
                            </div>

                            {/* Actions: READ / PREVIEW, DOWNLOAD, DELETE */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                              {/* READ / PREVIEW ACTION */}
                              <button
                                onClick={() => setPreviewFile(file)}
                                disabled={!isPreviewable}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                  isPreviewable
                                    ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white cursor-pointer"
                                    : "border-transparent text-slate-600 opacity-40 cursor-not-allowed"
                                }`}
                                title={isPreviewable ? "Preview object inline" : "Inline preview not available"}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Preview</span>
                              </button>

                              {/* DOWNLOAD ACTION */}
                              <button
                                onClick={() => handleDownloadFile(file)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-sky-500/20 hover:border-sky-500/40 text-slate-200 hover:text-sky-300 text-xs font-medium transition-colors cursor-pointer"
                                title="Download object directly from Amazon S3"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Download</span>
                              </button>

                              {/* DELETE ACTION */}
                              <button
                                onClick={() =>
                                  setFileToDelete({
                                    file,
                                    userName: selectedUser.name,
                                  })
                                }
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                                title="Permanently delete user's object from S3 & MongoDB"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-24 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                    <FolderOpen className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Select a User to Inspect Objects
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click any user in the accounts roster to read their files, preview inline, download, or permanently remove objects from Amazon S3.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* File Preview Modal (Reused) */}
      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownloadFile}
      />

      {/* Object Deletion Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">
              Delete User Object?
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              As Administrator, you are about to permanently delete this object uploaded by{" "}
              <strong className="text-white">{fileToDelete.userName}</strong>. This removes the file from both Amazon S3 and MongoDB.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 mb-6 text-xs space-y-1.5">
              <div className="font-semibold text-white truncate">
                {fileToDelete.file.originalName}
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Size: {formatBytes(fileToDelete.file.size)}</span>
                <span className="font-mono truncate max-w-[180px]">
                  {fileToDelete.file.key}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeletingAction}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteObject}
                disabled={isDeletingAction}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingAction ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting from S3 & Mongo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Deletion Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">
              Delete User & All Objects?
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              This will remove user <strong className="text-white">{userToDelete.name}</strong> and permanently delete all{" "}
              <strong className="text-rose-400">{userToDelete.objectCount} object(s)</strong> they uploaded from both Amazon S3 and MongoDB.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingAction}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingAction}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingAction ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Removing User & Files...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
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
  AlertTriangle,
  X,
  FileQuestion,
  ChevronRight,
} from "lucide-react";
import { CloudUser, S3FileItem } from "@/types/file";
import { FileIcon } from "@/components/files/FileIcon";
import { FilePreviewModal } from "@/components/modals/FilePreviewModal";
import { ToastContainer, ToastMessage } from "@/components/ui/Toast";
import { formatBytes, formatRelativeTime } from "@/lib/utils";

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
      setIsAuthenticated(Boolean(data.authenticated));
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

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = file.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-medium">Verifying CloudVault Admin session...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Admin Login Card
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        <div className="w-full max-w-md space-y-6">
          {/* Header Brand */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-xs">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              CloudVault Admin Portal
            </h1>
            <p className="text-xs text-slate-500">
              MongoDB Database & Multi-User Cloud Object Oversight
            </p>
          </div>

          {/* Login Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Administrator Sign In
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-semibold">
                <Database className="w-3 h-3" />
                MongoDB Atlas
              </span>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Admin Username
                </label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Academic Evaluation Credential:</span>
                </div>
                <p>
                  Stored and verified via MongoDB:{" "}
                  <code className="text-indigo-700 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
                    Adamas@2023
                  </code>
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated: Render Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Admin Top Navigation */}
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
              title="Return to Main Page"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    CloudVault Admin Console
                  </h1>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                    Superuser
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">
                  User object oversight, storage quotas & direct Amazon S3 file management
                </p>
              </div>
            </div>
          </div>

          {/* Right Admin Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 text-xs font-semibold">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>MongoDB Connected</span>
            </span>

            <button
              onClick={() => {
                setIsRefreshing(true);
                fetchAdminData();
                if (selectedUser) {
                  fetchUserFiles(selectedUser.name);
                }
              }}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              title="Refresh users and objects"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`}
              />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
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
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Users
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-slate-900 font-mono">
                {isLoadingUsers ? "..." : metrics.totalUsers}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Registered in MongoDB database
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
              Database: cloudvault
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Objects Uploaded
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Files className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-slate-900 font-mono">
                {isLoadingUsers ? "..." : metrics.totalObjects}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Active objects stored in Amazon S3
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
              Prefix: uploads/*
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Storage Consumed
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-slate-900 font-mono truncate">
                {isLoadingUsers ? "..." : metrics.totalStorageFormatted}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {(metrics.totalStorageBytes || 0).toLocaleString()} bytes
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
              Bucket: tushardevx01
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Security & Isolation
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-base font-bold text-emerald-700 font-mono">
                Admin Authorized
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Role: Super Administrator
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono truncate">
              Signed Session Token
            </div>
          </div>
        </div>

        {/* Workspace Layout: Left Users List | Right User Objects Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* USERS LIST (Left Column) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-600" />
                    <span>User Accounts</span>
                  </h2>
                  <p className="text-xs text-slate-500">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-100 transition-colors"
                />
              </div>

              {/* Users List */}
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {isLoadingUsers ? (
                  [...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 animate-pulse space-y-2"
                    >
                      <div className="h-4 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-200 rounded w-2/3" />
                    </div>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
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
                            ? "bg-indigo-50/60 border-indigo-300 shadow-xs ring-1 ring-indigo-200"
                            : "bg-slate-50/60 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-sm">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {u.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Last active: {formatRelativeTime(u.lastActiveAt || u.createdAt)}
                              </p>
                            </div>
                          </div>

                          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 font-semibold shadow-2xs">
                            <Files className="w-3 h-3 text-sky-600" />
                            <span>{u.objectCount} obj</span>
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            Total Space:{" "}
                            <strong className="text-slate-800 font-mono">
                              {u.totalSizeFormatted || formatBytes(u.totalSizeBytes)}
                            </strong>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectUser(u);
                              }}
                              className="text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
                            >
                              <span>Inspect</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserToDelete(u);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
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

          {/* USER OBJECTS INSPECTOR (Right Column) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 min-h-[500px]">
              {selectedUser ? (
                <>
                  {/* Selected User Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 font-bold text-base">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900 tracking-tight">
                            {selectedUser.name}&apos;s Uploaded Objects
                          </h2>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {filteredUserFiles.length} file(s)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Total Storage Used:{" "}
                          <span className="font-mono text-sky-600 font-semibold">
                            {selectedUser.totalSizeFormatted || formatBytes(selectedUser.totalSizeBytes)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors self-start sm:self-auto cursor-pointer"
                      title="Close user details"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Filter inside selected user files */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter objects by filename or key..."
                      value={searchFileTerm}
                      onChange={(e) => setSearchFileTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-100 transition-colors"
                    />
                  </div>

                  {/* User Files List */}
                  {isLoadingUserFiles ? (
                    <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                      <p className="text-xs">Loading objects from Amazon S3 & MongoDB...</p>
                    </div>
                  ) : filteredUserFiles.length === 0 ? (
                    <div className="py-16 text-center rounded-2xl bg-slate-50 border border-slate-200 p-6 space-y-2">
                      <FileQuestion className="w-8 h-8 text-slate-400 mx-auto" />
                      <h3 className="text-sm font-bold text-slate-900">
                        No uploaded objects found
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
                            className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="p-2 rounded-xl bg-white border border-slate-200 shrink-0 shadow-2xs">
                                <FileIcon
                                  category={file.category}
                                  mimeType={file.contentType}
                                  className="w-4 h-4"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900 text-xs truncate group-hover:text-sky-600 transition-colors">
                                  {file.originalName}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                                  <span>{formatBytes(file.size)}</span>
                                  <span>•</span>
                                  <span className="capitalize">{file.category}</span>
                                  <span>•</span>
                                  <span>{formatRelativeTime(file.lastModified)}</span>
                                </div>
                                <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                                  {file.key}
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                              <button
                                onClick={() => setPreviewFile(file)}
                                disabled={!isPreviewable}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                  isPreviewable
                                    ? "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer shadow-2xs"
                                    : "border-transparent text-slate-300 opacity-40 cursor-not-allowed"
                                }`}
                                title={isPreviewable ? "Preview object inline" : "Inline preview not available"}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Preview</span>
                              </button>

                              <button
                                onClick={() => handleDownloadFile(file)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-sky-50 hover:border-sky-200 text-slate-700 hover:text-sky-600 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                                title="Download object directly from Amazon S3"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Download</span>
                              </button>

                              <button
                                onClick={() =>
                                  setFileToDelete({
                                    file,
                                    userName: selectedUser.name,
                                  })
                                }
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
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
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                    <FolderOpen className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Select a User to Inspect Objects
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click any user in the accounts roster to read their files, preview inline, download, or permanently remove objects from Amazon S3.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownloadFile}
      />

      {/* Object Deletion Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Delete User Object?
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              As Administrator, you are about to permanently delete this object uploaded by{" "}
              <strong className="text-slate-900">{fileToDelete.userName}</strong>. This removes the file from both Amazon S3 and MongoDB.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-6 text-xs space-y-1.5">
              <div className="font-semibold text-slate-900 truncate">
                {fileToDelete.file.originalName}
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteObject}
                disabled={isDeletingAction}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Delete User & All Objects?
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              This will remove user <strong className="text-slate-900">{userToDelete.name}</strong> and permanently delete all{" "}
              <strong className="text-rose-600">{userToDelete.objectCount} object(s)</strong> they uploaded from both Amazon S3 and MongoDB.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingAction}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
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

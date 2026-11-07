"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Mail,
  Lock,
  User,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  Database,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "signin" | "signup" | "admin";
  onLoginSuccess?: (user: { username: string; email: string; name: string }) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  defaultTab = "signin",
  onLoginSuccess,
}: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "admin">(defaultTab);

  // Sign In state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sign Up state
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccessMsg, setSignupSuccessMsg] = useState<string | null>(null);

  // Username availability state (Bloom Filter powered)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    available?: boolean;
    message?: string;
    method?: "bloom_filter" | "database" | "validation";
    hitsDb?: boolean;
  } | null>(null);

  // Admin state
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("Adamas@2023");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const checkDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMode(defaultTab);
  }, [defaultTab, isOpen]);

  // Debounced Username availability check using Bloom Filter API
  useEffect(() => {
    if (mode !== "signup") return;

    const trimmed = signupUsername.trim();
    if (!trimmed) {
      setUsernameStatus(null);
      setIsCheckingUsername(false);
      return;
    }

    if (trimmed.length < 3) {
      setUsernameStatus({
        available: false,
        method: "validation",
        hitsDb: false,
        message: "Username must be at least 3 characters",
      });
      setIsCheckingUsername(false);
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      setUsernameStatus({
        available: false,
        method: "validation",
        hitsDb: false,
        message: "Letters, numbers, underscores, and dashes only",
      });
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);

    if (checkDebounceRef.current) {
      clearTimeout(checkDebounceRef.current);
    }

    checkDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        if (data.success) {
          setUsernameStatus({
            available: data.available,
            message: data.message,
            method: data.method,
            hitsDb: data.hitsDb,
          });
        }
      } catch (err) {
        console.error("Failed to check username availability:", err);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 280);

    return () => {
      if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
    };
  }, [signupUsername, mode]);

  if (!isOpen) return null;

  // Handle User Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmittingLogin(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "cloudvault_user",
            JSON.stringify(data.user)
          );
          localStorage.setItem("cloudvault_uploader_name", data.user.name || data.user.username);
        }
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
        onClose();
        router.push("/dashboard");
      } else {
        setLoginError(data.error || "Invalid username or password.");
      }
    } catch {
      setLoginError("Failed to connect to authentication server.");
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // Handle User Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupSuccessMsg(null);

    if (usernameStatus && !usernameStatus.available) {
      setSignupError(usernameStatus.message || "Please choose an available username.");
      return;
    }

    setIsSubmittingSignup(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: signupUsername,
          email: signupEmail,
          password: signupPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSignupSuccessMsg("Account created! Redirecting to login...");
        // Auto-switch to login tab and prefill username after 1 second
        setTimeout(() => {
          setLoginIdentifier(signupUsername);
          setLoginPassword("");
          setMode("signin");
          setSignupSuccessMsg(null);
        }, 1200);
      } else {
        setSignupError(data.error || "Failed to create account.");
      }
    } catch {
      setSignupError("Failed to submit registration request.");
    } finally {
      setIsSubmittingSignup(false);
    }
  };

  // Handle Admin Sign In
  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setIsSubmittingAdmin(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onClose();
        router.push("/admin");
      } else {
        setAdminError(data.error || "Invalid administrator credentials.");
      }
    } catch {
      setAdminError("Failed to connect to administrator authentication service.");
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
          aria-label="Close auth modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto text-sky-600 mb-3 shadow-xs">
            {mode === "admin" ? (
              <Shield className="w-6 h-6 text-indigo-600" />
            ) : (
              <User className="w-6 h-6 text-sky-600" />
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {mode === "admin"
              ? "Administrator Access"
              : mode === "signup"
              ? "Create your CloudVault Account"
              : "Welcome back to CloudVault"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === "admin"
              ? "Privileged access to system oversight and database storage metrics"
              : mode === "signup"
              ? "Create your personal cloud vault to securely store and access your files"
              : "Enter your credentials to access your personal cloud vault"}
          </p>

          {/* Mode Switcher Tabs (Sign In vs Sign Up) */}
          {mode !== "admin" && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mt-5 gap-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setLoginError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === "signin"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setSignupError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* TAB 1: SIGN IN FORM */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. aditya or name@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingLogin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: SIGN UP FORM (with Bloom Filter Username Search) */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              {signupSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{signupSuccessMsg}</span>
                </div>
              )}

              {signupError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{signupError}</span>
                </div>
              )}

              {/* Username with Availability Check */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Username
                  </label>
                  {isCheckingUsername && (
                    <span className="text-[10px] text-slate-400">Checking...</span>
                  )}
                </div>

                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="e.g. aditya_roy"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                      usernameStatus?.available === true
                        ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"
                        : usernameStatus?.available === false
                        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                        : "border-slate-200 focus:border-sky-500 focus:ring-sky-100"
                    }`}
                  />

                  {/* Dynamic Status Icon */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingUsername ? (
                      <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
                    ) : usernameStatus?.available === true ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : usernameStatus?.available === false ? (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    ) : null}
                  </div>
                </div>

                {/* Real-time Availability */}
                {signupUsername.trim().length > 0 && usernameStatus && (
                  <div
                    className={`mt-1.5 p-2 rounded-lg text-[11px] leading-relaxed flex items-center gap-1.5 ${
                      usernameStatus.available
                        ? "bg-emerald-50/80 text-emerald-800 border border-emerald-200/60"
                        : "bg-rose-50/80 text-rose-700 border border-rose-200/60"
                    }`}
                  >
                    {usernameStatus.available ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    )}
                    <span className="font-medium">
                      {usernameStatus.available
                        ? "Username is available"
                        : usernameStatus.message || "Username is already taken"}
                    </span>
                  </div>
                )}
              </div>

              {/* Gmail / Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Gmail / Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingSignup || isCheckingUsername || (usernameStatus !== null && !usernameStatus.available)}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingSignup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: ADMIN LOGIN */}
          {mode === "admin" && (
            <form onSubmit={handleAdminSignIn} className="space-y-4">
              {adminError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{adminError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Administrator Username
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Administrator Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Adamas@2023"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Verified securely against MongoDB admin credentials.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAdmin}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAdmin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Admin Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Enter Admin Dashboard</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  ← Back to standard user login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Bottom: Administrator Option */}
        {mode !== "admin" && (
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              System evaluation or faculty review?
            </span>
            <button
              type="button"
              onClick={() => {
                setMode("admin");
                setAdminError(null);
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Login as Administrator</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


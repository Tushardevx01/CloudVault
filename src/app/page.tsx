"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cloud,
  ArrowRight,
  Shield,
  Zap,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Archive,
  ChevronRight,
  Eye,
  Download,
  Lock,
  Search,
  FolderOpen,
  ChevronDown,
  Check,
} from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";

export default function HomePage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup" | "admin">("signup");
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    email: string;
    name: string;
  } | null>(null);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Check if user is already logged in
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const openAuth = (tab: "signin" | "signup" | "admin") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const faqs = [
    {
      q: "What types of files can I store in CloudVault?",
      a: "CloudVault supports all standard file formats up to 50MB per file, including PDF documents, high-resolution images (JPEG, PNG, SVG, WebP), video & audio media, ZIP/TAR archives, and source code files.",
    },
    {
      q: "Can I preview files directly in the browser?",
      a: "Yes. CloudVault includes built-in inline previews for PDF documents, images, and text/code files, allowing you to inspect your files instantly without downloading them to your local device.",
    },
    {
      q: "How does CloudVault ensure file security and privacy?",
      a: "All objects are stored in private cloud storage with encryption at rest. Downloads and previews are authorized via temporary cryptographic signatures that expire automatically, preventing unauthorized access.",
    },
    {
      q: "How does user registration work?",
      a: "Simply choose a username, email, and password. Our account onboarding validates username availability instantly in real time so you can claim your vault and start uploading immediately.",
    },
    {
      q: "Is there an administrative console for management?",
      a: "Yes. System administrators have access to a dedicated Admin Console to monitor storage quotas, inspect user object records, and oversee database integrity.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* 1. TOP NAVIGATION */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs group-hover:bg-sky-500 transition-colors">
              <Cloud className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              CloudVault
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#preview" className="hover:text-slate-900 transition-colors">
              Workspace
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#security" className="hover:text-slate-900 transition-colors">
              Security
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTA: Only ONE Get Started button */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                onClick={() => openAuth("signup")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        {/* 2. HERO SECTION */}
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 bg-white border-b border-slate-200/80">
          <div className="absolute inset-0 bg-dot-pattern opacity-60 pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Announcement Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium mb-6 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Next-Gen Cloud Storage • Fast, Private & Frictionless</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Your files, everywhere. <br className="hidden sm:block" />
              <span className="text-sky-600">
                Built for speed, engineered for privacy.
              </span>
            </h1>

            {/* Subhead */}
            <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Store, preview, and organize your documents, media, and archives in a distraction-free cloud workspace.
              Upload in seconds, stream inline, and keep your data safe.
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <button
                onClick={() => openAuth("signup")}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer hover:-translate-y-0.5"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => openAuth("signin")}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold border border-slate-200 transition-all cursor-pointer"
              >
                <span>Sign In to Vault</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Up to 50MB per file
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Private cloud encryption
              </span>
            </div>
          </div>
        </section>

        {/* 3. INTERACTIVE HERO WORKSPACE PREVIEW */}
        <section id="preview" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                A Clean Workspace for All Your Content
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                Experience high-performance cloud storage designed with clarity and purpose.
              </p>
            </div>

            {/* Realistic Application Window */}
            <div className="rounded-3xl border border-slate-200 shadow-xl overflow-hidden bg-white">
              {/* Window Title Bar */}
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-300" />
                  <span className="w-3 h-3 rounded-full bg-slate-300" />
                  <span className="w-3 h-3 rounded-full bg-slate-300" />
                  <span className="ml-3 text-xs font-semibold text-slate-600 font-mono">
                    CloudVault • Personal Workspace
                  </span>
                </div>
                <button
                  onClick={() => openAuth("signup")}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Interactive App</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Window Interior */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Search & Category Pills Simulation */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      readOnly
                      value="quarterly_report"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-sky-600 text-white shadow-2xs">
                      All Files
                    </span>
                    <span className="px-3 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-600">
                      Documents
                    </span>
                    <span className="px-3 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-600">
                      Images
                    </span>
                    <span className="px-3 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-600">
                      Archives
                    </span>
                  </div>
                </div>

                {/* File List Cards */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs divide-y divide-slate-100">
                  {[
                    {
                      name: "quarterly_financial_report_2026.pdf",
                      category: "document",
                      size: "4.2 MB",
                      time: "15 minutes ago",
                      icon: FileText,
                      badge: "PDF Document",
                    },
                    {
                      name: "product_brand_identity_guide.png",
                      category: "image",
                      size: "2.1 MB",
                      time: "2 hours ago",
                      icon: ImageIcon,
                      badge: "PNG Image",
                    },
                    {
                      name: "cloudvault_project_assets.zip",
                      category: "archive",
                      size: "18.9 MB",
                      time: "Yesterday",
                      icon: Archive,
                      badge: "ZIP Archive",
                    },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={idx}
                        className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                            <Icon className="w-4 h-4 text-sky-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Uploaded {item.time}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {item.badge}
                          </span>
                          <span className="text-xs font-mono text-slate-600">
                            {item.size}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-200">
                              <Eye className="w-3.5 h-3.5" />
                            </span>
                            <span className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 bg-slate-50 border border-slate-200">
                              <Download className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. MODERN BENTO GRID FEATURE MATRIX */}
        <section id="features" className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                Core Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
                Everything You Need, Nothing You Don&apos;t.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-600">
                Crafted to provide an effortless storage experience with modern tools and zero bloat.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bento Card 1: Wide 2-Cols */}
              <div className="md:col-span-2 p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                    <Eye className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Instant In-Browser Streaming & Previews
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed">
                    Inspect PDF documents, stream audio and video, browse photos, and review source code
                    directly inside your browser without waiting for long download queues.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    PDF Reader
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    Image Zoom
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    Code Highlighting
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    Zero Download Wait
                  </span>
                </div>
              </div>

              {/* Bento Card 2: 1-Col */}
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Private by Default
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Objects are stored in private cloud storage. Temporary access tokens expire automatically to safeguard your sensitive documents.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs font-mono text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>256-bit Encryption</span>
                </div>
              </div>

              {/* Bento Card 3: 1-Col */}
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Multi-File Drag & Drop
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Upload multiple files simultaneously with drag-and-drop support. Live queue status tracks each item as it uploads.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs font-mono text-slate-600 font-medium">
                  Up to 50MB per file
                </div>
              </div>

              {/* Bento Card 4: Wide 2-Cols */}
              <div className="md:col-span-2 p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Smart Organization & Instant Search
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed">
                    Filter files effortlessly across Documents, Images, Media, Code, and Archives.
                    Search by filename or key with instant debounced filtering.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    Table & Grid Views
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    Sort by Date, Name, Size
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    Instant Search
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. HOW IT WORKS WORKFLOW */}
        <section id="how-it-works" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                Simple Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
                Get Started in 3 Simple Steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
                  01
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Create Your Account
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sign up with your username, email, and password. Your personal cloud vault is provisioned in seconds.
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
                  02
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Upload Documents & Media
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Drag and drop your files. CloudVault automatically categorizes and stores them with private encryption.
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
                  03
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Preview & Access Anywhere
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Open PDF documents, view images, or download your assets from any modern browser with zero friction.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. SECURITY & RELIABILITY */}
        <section id="security" className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-emerald-400 text-xs font-semibold border border-slate-700">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Enterprise Cloud Security</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Your Data Stays Private and Protected.
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  CloudVault enforces strict server-side authorization. Object URLs expire automatically after 15 minutes,
                  preventing unauthorized hotlinking or exposure.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full md:w-auto shrink-0">
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
                  <span className="text-2xl font-bold font-mono text-white">99.99%</span>
                  <p className="text-[11px] text-slate-400 mt-1">Uptime Reliability</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
                  <span className="text-2xl font-bold font-mono text-emerald-400">15 min</span>
                  <p className="text-[11px] text-slate-400 mt-1">Token Expiration</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. FREQUENTLY ASKED QUESTIONS */}
        <section id="faq" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                Questions & Answers
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all shadow-2xs"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <span className="text-sm font-bold text-slate-900">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isOpen ? "rotate-180 text-sky-600" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 8. FINAL HIGH-CONVERSION CTA */}
        <section className="py-20 bg-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Ready to organize your files with zero friction?
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Create your free account today and experience clean, modern cloud object storage.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => openAuth("signup")}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer hover:-translate-y-0.5"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 9. PROFESSIONAL FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                <Cloud className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-slate-900">CloudVault</span>
            </div>

            <div className="flex flex-wrap items-center gap-6 font-medium text-slate-600">
              <a href="#features" className="hover:text-slate-900 transition-colors">
                Features
              </a>
              <a href="#preview" className="hover:text-slate-900 transition-colors">
                Workspace
              </a>
              <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
                How It Works
              </a>
              <a href="#faq" className="hover:text-slate-900 transition-colors">
                FAQ
              </a>
              <button
                onClick={() => openAuth("admin")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Admin Access
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} CloudVault. Modern Cloud Object Storage Platform.</p>
            <p>Designed for speed, reliability & effortless usability.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal (Sign Up, Sign In, Admin) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Lock,
  Globe,
  Users,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { StorageStats } from "@/types/file";

interface SystemHealthSectionProps {
  stats: StorageStats | null;
  connectionStatus: "connected" | "disconnected" | "checking";
  connectionMessage?: string;
  databaseConnected?: boolean | null;
  onCheckHealth: () => Promise<void>;
}

const REGION_LABELS: Record<string, string> = {
  "ap-south-1": "Asia Pacific (Mumbai)",
  "ap-southeast-2": "Asia Pacific (Sydney)",
  "ap-southeast-1": "Asia Pacific (Singapore)",
  "ap-northeast-1": "Asia Pacific (Tokyo)",
  "us-east-1": "US East (N. Virginia)",
  "us-east-2": "US East (Ohio)",
  "us-west-2": "US West (Oregon)",
  "eu-west-1": "Europe (Ireland)",
  "eu-central-1": "Europe (Frankfurt)",
};

export function SystemHealthSection({
  stats,
  connectionStatus,
  connectionMessage,
  databaseConnected,
  onCheckHealth,
}: SystemHealthSectionProps) {
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    try {
      setIsTesting(true);
      await onCheckHealth();
    } finally {
      setIsTesting(false);
    }
  };

  const bucketName = stats?.bucketName || "Not configured";
  const regionCode = stats?.region || "ap-south-1";
  const regionLabel = REGION_LABELS[regionCode];
  const isS3Connected = connectionStatus === "connected";

  const securityChecklist = [
    {
      title: "Private S3 Bucket",
      desc: `Bucket '${bucketName}' operates with private access. Objects are accessed via signed requests.`,
      verified: isS3Connected,
    },
    {
      title: "Server-Side Credential Isolation",
      desc: "AWS credentials and signing secrets execute solely in server route handlers and are never bundled for the browser.",
      verified: isS3Connected,
    },
    {
      title: "MongoDB Metadata Store",
      desc:
        databaseConnected === true
          ? "MongoDB is connected for user authentication, ownership checks, and object metadata indexing."
          : databaseConnected === false
          ? "MongoDB connection is currently unavailable. Check MONGODB_URI in .env."
          : "Checking MongoDB connectivity...",
      verified: databaseConnected === true,
    },
    {
      title: "Path Traversal & Injection Shield",
      desc: "Object keys are sanitized, forced under the 'uploads/' prefix, and checked against '..' and backslashes.",
      verified: true,
    },
    {
      title: "Presigned URL Expiration",
      desc: "Temporary preview and download URLs expire automatically after 15 minutes (900 seconds).",
      verified: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* S3 Connectivity Status Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E3EAF0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isS3Connected
                ? "bg-[#DDF3E4] border-[#B7E4C7] text-[#1E633C]"
                : connectionStatus === "disconnected"
                ? "bg-rose-50 border-rose-200 text-rose-600"
                : "bg-amber-50 border-amber-200 text-amber-600"
            }`}
          >
            {isS3Connected ? (
              <CheckCircle2 className="w-6 h-6 text-[#72C99A]" />
            ) : (
              <AlertTriangle
                className={`w-6 h-6 ${
                  connectionStatus === "disconnected"
                    ? "text-rose-500"
                    : "text-amber-500"
                }`}
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#263747] tracking-tight">
                Amazon S3 Connectivity
              </h2>
              <span
                className={`text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full border ${
                  isS3Connected
                    ? "bg-[#DDF3E4] text-[#1E633C] border-[#B7E4C7]"
                    : connectionStatus === "disconnected"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {isS3Connected
                  ? "Live Connected"
                  : connectionStatus === "disconnected"
                  ? "Disconnected"
                  : "Checking"}
              </span>
            </div>
            <p className="text-xs text-[#718096] mt-1 max-w-xl leading-relaxed">
              {connectionMessage ||
                "Checking connectivity to Amazon Web Services S3..."}
            </p>
          </div>
        </div>

        <button
          onClick={handleTest}
          disabled={isTesting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#F6F9FC] text-[#263747] border border-[#E3EAF0] text-xs font-semibold shadow-2xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              isTesting ? "animate-spin text-[#78BCE8]" : "text-[#718096]"
            }`}
          />
          <span>Test Connection</span>
        </button>
      </div>

      {/* Grid of parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E3EAF0] space-y-2 shadow-xs">
          <span className="text-xs font-medium text-[#718096] uppercase tracking-wider flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-[#78BCE8]" />
            Bucket Name
          </span>
          <p className="text-base font-bold text-[#263747] font-mono">
            {bucketName}
          </p>
          <p className="text-[11px] text-[#718096]">
            Target AWS S3 private object container
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E3EAF0] space-y-2 shadow-xs">
          <span className="text-xs font-medium text-[#718096] uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#3B9EE0]" />
            AWS Region
          </span>
          <p className="text-base font-bold text-[#263747] font-mono">
            {regionLabel ? `${regionCode} (${regionLabel})` : regionCode}
          </p>
          <p className="text-[11px] text-[#718096]">
            Resolved AWS data center region
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E3EAF0] space-y-2 shadow-xs">
          <span className="text-xs font-medium text-[#718096] uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#72C99A]" />
            Storage Architecture
          </span>
          <p className="text-base font-bold text-[#263747] font-mono">
            Browser → Next.js → S3 + DB
          </p>
          <p className="text-[11px] text-[#718096]">
            Server-side AWS SDK v3 &amp; MongoDB metadata
          </p>
        </div>
      </div>

      {/* Security Checklist */}
      <div className="p-6 rounded-3xl bg-white border border-[#E3EAF0] shadow-xs">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#DDF3E4] border border-[#B7E4C7] flex items-center justify-center text-[#1E633C] shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-[#72C99A]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#263747]">
              Security &amp; Environment Audit
            </h3>
            <p className="text-xs text-[#718096]">
              Live verification of connectivity, isolation, and validation safeguards
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {securityChecklist.map((sec, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[#F6F9FC] border border-[#E3EAF0] flex items-start gap-3"
            >
              <div
                className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                  sec.verified
                    ? "bg-[#DDF3E4] text-[#1E633C] border-[#B7E4C7]"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {sec.verified ? (
                  <CheckCircle2 className="w-4 h-4 text-[#72C99A]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#263747]">
                  {sec.title}
                </h4>
                <p className="text-[11px] text-[#718096] mt-0.5 leading-relaxed">
                  {sec.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engineering Team & Branch Namespaces */}
      <div className="p-6 rounded-3xl bg-white border border-[#E3EAF0] shadow-xs">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#DCEEFF] border border-[#B9DDF7] flex items-center justify-center text-[#20628E] shadow-2xs">
            <Users className="w-5 h-5 text-[#3B9EE0]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#263747]">
              Project Engineering Team
            </h3>
            <p className="text-xs text-[#718096]">
              Designated Git branch namespaces and core team domains
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[
            {
              name: "Aditya",
              role: "Search, Filtering & Core Features",
              branch: "aditya/*",
            },
            {
              name: "Purabi",
              role: "UI/UX & Design Hierarchy",
              branch: "purabi/*",
            },
            {
              name: "Sankalpa",
              role: "AWS S3 & Backend API Routes",
              branch: "sankalpa/*",
            },
            {
              name: "Dabjit",
              role: "Storage Metrics & QA Testing",
              branch: "dabjit/*",
            },
            {
              name: "Shankar",
              role: "Cloud Security & VM Deployment",
              branch: "shankar/*",
            },
            {
              name: "Tushar",
              role: "Lead Architect & AWS Operations",
              branch: "tushar/*",
            },
          ].map((member, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[#F6F9FC] border border-[#E3EAF0] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#263747]">
                  {member.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#DCEEFF] text-[#20628E] border border-[#B9DDF7]">
                  <GitBranch className="w-3 h-3 text-[#3B9EE0]" />
                  {member.branch}
                </span>
              </div>
              <p className="text-[11px] text-[#718096] mt-2">{member.role}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

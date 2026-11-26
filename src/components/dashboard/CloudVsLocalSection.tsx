"use client";

import React, { useState } from "react";
import {
  HardDrive,
  Cloud,
  CheckCircle2,
  Layers,
  Terminal,
  Database,
} from "lucide-react";

export function CloudVsLocalSection() {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  const demonstrationSteps = [
    {
      step: 1,
      title: "Upload from Local Computer",
      desc: "User selects a file from local disk (Windows, Mac, or Linux) and streams it via HTTP POST.",
    },
    {
      step: 2,
      title: "Storage in Amazon S3 Bucket",
      desc: "Next.js backend receives payload and dispatches PutObjectCommand to private bucket 'tushardevx01' in AWS Mumbai (ap-south-1).",
    },
    {
      step: 3,
      title: "Real-time Verification in CloudVault",
      desc: "Application queries ListObjectsV2 to reflect the new object key, size, category, and timestamp in the dashboard.",
    },
    {
      step: 4,
      title: "Download from Cloud Storage",
      desc: "Browser requests file via secure presigned GET URL with preserved original filename header.",
    },
    {
      step: 5,
      title: "Permanent Deletion from S3",
      desc: "DeleteObjectCommand executes against S3. Metrics and storage counters update immediately.",
    },
    {
      step: 6,
      title: "Cross-Environment Remote Access",
      desc: "Clone this repository on an Ubuntu VirtualBox VM, run 'npm run dev' with identical .env, and observe identical files without copying local disk files.",
    },
    {
      step: 7,
      title: "Architectural Differentiation Defense",
      desc: "Articulate the fundamental shift from local block/POSIX filesystems to distributed, durable cloud object storage.",
    },
  ];

  const comparisonMatrix = [
    {
      attribute: "Core Abstraction",
      local: "Hierarchical Tree: Directories, files, and filesystem inodes (NTFS, Ext4, APFS).",
      cloud: "Flat Object Storage: Bucket + Unique Keys with associated User Metadata (Amazon S3).",
    },
    {
      attribute: "Access Protocol",
      local: "Kernel POSIX system calls (open(), read(), write(), close()) over local bus.",
      cloud: "Stateless REST API over HTTPS (GET, PUT, DELETE) & short-lived presigned URLs.",
    },
    {
      attribute: "Durability & Redundancy",
      local: "Single Point of Failure (SPOF): Disk failure or sector corruption causes data loss without manual RAID.",
      cloud: "99.999999999% (11 9's) durability. Objects automatically replicated across at least 3 geographically separated Availability Zones (AZs).",
    },
    {
      attribute: "Capacity & Elasticity",
      local: "Hard limit bound to physical drive partition. Expansion requires repartitioning or hardware replacement.",
      cloud: "Virtually infinite on-demand scalability with zero capacity planning or partition management.",
    },
    {
      attribute: "Compute Decoupling",
      local: "Storage is tightly coupled to the host OS. Shutting down the machine prevents any external access.",
      cloud: "Decoupled architecture: Any authorized compute instance (Localhost, VirtualBox, EC2) accesses the identical data layer.",
    },
    {
      attribute: "Security & Access Control",
      local: "Local OS file permissions (chmod, chown, POSIX ACLs) tied to local system user IDs.",
      cloud: "Cloud IAM policies, Bucket Policies, fine-grained KMS encryption at rest, and presigned time-limited access tokens.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E3EAF0] shadow-xs relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCEEFF] border border-[#B9DDF7] text-[#20628E] text-xs font-semibold mb-3">
            <Layers className="w-3.5 h-3.5 text-[#3B9EE0]" />
            <span>Architecture & Demonstration Guide</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#263747] tracking-tight">
            Local Storage vs. Cloud Object Storage
          </h2>
          <p className="text-sm text-[#718096] mt-2 leading-relaxed">
            CloudVault demonstrates the transition from traditional host-bound block storage to scalable, highly available Amazon S3 cloud storage. The application decouples file persistence from application runtime, ensuring zero data loss across restarts or multi-host deployments.
          </p>
        </div>
      </div>

      {/* 7-Step Demonstration Checklist */}
      <div className="p-6 rounded-3xl bg-white border border-[#E3EAF0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DDF3E4] border border-[#B7E4C7] flex items-center justify-center text-[#1E633C] shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-[#72C99A]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#263747]">
                Live Demonstration Checklist
              </h3>
              <p className="text-xs text-[#718096]">
                Click steps to mark demonstration progress during project evaluation
              </p>
            </div>
          </div>
          <div className="text-xs font-mono font-semibold text-[#1E633C] bg-[#DDF3E4] px-3.5 py-1.5 rounded-full border border-[#B7E4C7] self-start sm:self-auto">
            {Object.values(completedSteps).filter(Boolean).length} / 7 Completed
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {demonstrationSteps.map((item) => {
            const isDone = Boolean(completedSteps[item.step]);
            return (
              <div
                key={item.step}
                onClick={() => toggleStep(item.step)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isDone
                    ? "bg-[#DDF3E4]/30 border-[#B7E4C7] shadow-2xs"
                    : "bg-[#F6F9FC] border-[#E3EAF0] hover:border-[#B9DDF7] hover:bg-white"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono transition-colors ${
                    isDone
                      ? "bg-[#72C99A] text-white shadow-2xs"
                      : "bg-white text-[#718096] border border-[#E3EAF0]"
                  }`}
                >
                  {isDone ? "✓" : item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-xs sm:text-sm font-semibold truncate ${
                      isDone ? "text-[#263747]" : "text-[#718096]"
                    }`}
                  >
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-[#718096] mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="p-6 rounded-3xl bg-white border border-[#E3EAF0] shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#DCEEFF] border border-[#B9DDF7] flex items-center justify-center text-[#20628E] shadow-2xs">
            <Database className="w-5 h-5 text-[#3B9EE0]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#263747]">
              Technical Comparison Matrix
            </h3>
            <p className="text-xs text-[#718096]">
              POSIX Local Disk Filesystems vs. AWS Amazon S3 Object Storage
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#E3EAF0]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3EAF0] bg-[#F6F9FC] text-[#718096] font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 sm:px-6 w-1/4">Evaluation Parameter</th>
                <th className="py-3.5 px-4 sm:px-6 w-3/8 text-[#263747]">
                  <HardDrive className="w-4 h-4 inline mr-1 text-[#718096]" />
                  Local File Storage
                </th>
                <th className="py-3.5 px-4 sm:px-6 w-3/8 text-[#20628E]">
                  <Cloud className="w-4 h-4 inline mr-1 text-[#3B9EE0]" />
                  Amazon S3 Cloud Storage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAF0]/60 text-[#263747]">
              {comparisonMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#F6F9FC] transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#263747] whitespace-nowrap">
                    {row.attribute}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-[#718096] leading-relaxed">
                    {row.local}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-[#20628E] leading-relaxed font-medium bg-[#DCEEFF]/15">
                    {row.cloud}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ubuntu VirtualBox Instructions */}
      <div className="p-6 rounded-3xl bg-white border border-[#E3EAF0] shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#DDF3E4] border border-[#B7E4C7] flex items-center justify-center text-[#1E633C] shadow-2xs">
            <Terminal className="w-5 h-5 text-[#72C99A]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#263747]">
              Ubuntu VirtualBox Demonstration Instructions
            </h3>
            <p className="text-xs text-[#718096]">
              Demonstrating cloud decoupling by accessing the exact same S3 files from a remote VM
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F6F9FC] border border-[#E3EAF0] font-mono text-xs text-[#263747] space-y-2.5 overflow-x-auto">
          <div className="text-[#718096]"># 1. Inside Ubuntu VirtualBox, clone repository</div>
          <div className="text-[#20628E] font-bold">git clone https://github.com/tushardevx01/CloudVault.git</div>
          <div className="text-[#20628E] font-bold">cd CloudVault</div>
          <div className="text-[#718096] mt-2"># 2. Configure the identical single .env file</div>
          <div className="text-[#1E633C] font-semibold">nano .env</div>
          <div className="text-[#718096] pl-4">
            AWS_REGION=ap-south-1<br />
            AWS_ACCESS_KEY_ID=your_access_key_here<br />
            AWS_SECRET_ACCESS_KEY=your_secret_key_here<br />
            AWS_S3_BUCKET_NAME=tushardevx01
          </div>
          <div className="text-[#718096] mt-2"># 3. Install dependencies and start server</div>
          <div className="text-[#20628E] font-bold">npm install</div>
          <div className="text-[#20628E] font-bold">npm run dev</div>
          <div className="text-[#1E633C] font-semibold mt-2"># 4. Open http://localhost:3000 to see all files synced via S3!</div>
        </div>
      </div>
    </div>
  );
}

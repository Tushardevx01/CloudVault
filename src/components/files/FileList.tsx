"use client";

import React from "react";
import { Eye, Download, Trash2, FileQuestion } from "lucide-react";
import { S3FileItem } from "@/types/file";
import { FileIcon } from "./FileIcon";
import { formatBytes, formatDate, formatRelativeTime } from "@/lib/utils";

interface FileListProps {
  files: S3FileItem[];
  isLoading?: boolean;
  onPreview: (file: S3FileItem) => void;
  onDownload: (file: S3FileItem) => void;
  onDelete: (file: S3FileItem) => void;
  onOpenUpload: () => void;
  currentUsername?: string;
  isAdmin?: boolean;
}

export function FileList({
  files,
  isLoading,
  onPreview,
  onDownload,
  onDelete,
  onOpenUpload,
  currentUsername,
  isAdmin = false,
}: FileListProps) {
  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-3xl border border-white/80 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(150,175,205,0.08)]">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3EAF0]/60 bg-[#F6F9FC]/60 text-[#7A8792] font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 sm:px-6">Name</th>
                <th className="py-3.5 px-4">Size</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Uploaded By</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Category</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">Date</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAF0]/50">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#F6F9FC] shrink-0" />
                      <div className="h-3.5 bg-[#E3EAF0] rounded w-48 max-w-full" />
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-3.5 bg-[#E3EAF0] rounded w-16" />
                  </td>
                  <td className="py-3.5 px-4 hidden sm:table-cell">
                    <div className="h-5 bg-[#E3EAF0] rounded-full w-24" />
                  </td>
                  <td className="py-3.5 px-4 hidden md:table-cell">
                    <div className="h-4 bg-[#E3EAF0] rounded w-14" />
                  </td>
                  <td className="py-3.5 px-4 hidden lg:table-cell">
                    <div className="h-3.5 bg-[#E3EAF0] rounded w-20" />
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-right">
                    <div className="h-7 bg-[#E3EAF0] rounded w-20 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="w-full py-14 px-4 text-center rounded-3xl bg-white/90 backdrop-blur-md border border-white shadow-[0_4px_20px_rgba(150,175,205,0.08)]">
        <div className="w-12 h-12 rounded-2xl bg-[#D8EEFF] border border-[#8CBCE8]/40 flex items-center justify-center mx-auto mb-3 text-[#20628E] shadow-2xs">
          <FileQuestion className="w-6 h-6 text-[#8CBCE8]" />
        </div>
        <h3 className="text-sm font-bold text-[#29343D]">No files found</h3>
        <p className="text-xs text-[#7A8792] max-w-sm mx-auto mt-1 mb-4">
          Your cloud vault is ready. Upload your first document, image, or media asset to begin.
        </p>
        <button
          onClick={onOpenUpload}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-[#8CBCE8] to-[#A399F0] hover:opacity-95 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(140,188,232,0.3)] transition-all cursor-pointer"
        >
          Upload Files
        </button>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-white/80 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(150,175,205,0.08)]">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E3EAF0]/60 bg-[#F6F9FC]/60 text-[#7A8792] font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 sm:px-6">Name</th>
              <th className="py-3.5 px-4">Size</th>
              <th className="py-3.5 px-4 hidden sm:table-cell">Uploaded By</th>
              <th className="py-3.5 px-4 hidden md:table-cell">Category</th>
              <th className="py-3.5 px-4 hidden lg:table-cell">Date</th>
              <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3EAF0]/60 text-[#29343D]">
            {files.map((file) => {
              const isPreviewable =
                file.category === "image" ||
                file.originalName.toLowerCase().endsWith(".pdf") ||
                file.category === "code";

              const isOwner = Boolean(
                currentUsername &&
                file.uploadedBy &&
                file.uploadedBy.toLowerCase().trim() === currentUsername.toLowerCase().trim()
              );
              const canDelete = isAdmin || isOwner;

              return (
                <tr
                  key={file.key}
                  onClick={() => onPreview(file)}
                  className="hover:bg-[#F6F9FC]/80 transition-colors group cursor-pointer"
                >
                  {/* Filename & Icon */}
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white border border-[#E3EAF0] shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                        <FileIcon
                          category={file.category}
                          mimeType={file.contentType}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="min-w-0 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
                        <p className="font-semibold text-[#29343D] truncate group-hover:text-[#20628E] transition-colors">
                          {file.originalName}
                        </p>
                        <p className="text-[11px] text-[#7A8792] sm:hidden">
                          by <span className="font-semibold text-[#29343D]">@{file.uploadedBy || "User"}</span> • {formatRelativeTime(file.lastModified)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Size */}
                  <td className="py-3 px-4 font-mono text-[#7A8792] whitespace-nowrap">
                    {formatBytes(file.size)}
                  </td>

                  {/* Uploaded By */}
                  <td className="py-3 px-4 hidden sm:table-cell whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E6E1FA]/70 text-[#29343D] border border-white">
                      <div className="w-4 h-4 rounded-full bg-[#8CBCE8] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                        {(file.uploadedBy || "User").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-xs">
                        @{file.uploadedBy || "User"}
                      </span>
                    </div>
                  </td>

                  {/* Category / MIME */}
                  <td className="py-3 px-4 hidden md:table-cell whitespace-nowrap">
                    <span className="capitalize px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#DDF3E4] text-[#1E633C] border border-[#BCE6CE]">
                      {file.category}
                    </span>
                  </td>

                  {/* Upload Date */}
                  <td className="py-3 px-4 hidden lg:table-cell text-[#7A8792] whitespace-nowrap">
                    <span title={formatDate(file.lastModified)}>
                      {formatRelativeTime(file.lastModified)}
                    </span>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Preview Button */}
                      <button
                        onClick={() => onPreview(file)}
                        disabled={!isPreviewable}
                        className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center ${
                          isPreviewable
                            ? "border-[#E3EAF0] bg-white hover:bg-[#D8EEFF] text-[#7A8792] hover:text-[#20628E] cursor-pointer shadow-2xs"
                            : "border-transparent text-[#7A8792] cursor-not-allowed opacity-30"
                        }`}
                        title={isPreviewable ? "Preview file" : "Preview not supported"}
                        aria-label="Preview file"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Download Button */}
                      <button
                        onClick={() => onDownload(file)}
                        className="w-7 h-7 rounded-full border border-[#E3EAF0] bg-white hover:bg-[#DDF3E4] hover:border-[#BCE6CE] text-[#7A8792] hover:text-[#1E633C] transition-all cursor-pointer shadow-2xs flex items-center justify-center"
                        title="Download file"
                        aria-label="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button (Only file owner or admin can delete) */}
                      {canDelete && (
                        <button
                          onClick={() => onDelete(file)}
                          className="w-7 h-7 rounded-full border border-[#E3EAF0] bg-white hover:bg-rose-50 hover:border-rose-200 text-[#7A8792] hover:text-rose-600 transition-all cursor-pointer shadow-2xs flex items-center justify-center"
                          title="Delete file"
                          aria-label="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

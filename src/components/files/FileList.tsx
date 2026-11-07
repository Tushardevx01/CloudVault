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
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 sm:px-6">Name</th>
                <th className="py-3.5 px-4">Size</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Uploaded By</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Category</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">Date</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
                      <div className="h-3.5 bg-slate-200 rounded w-48 max-w-full" />
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-3.5 bg-slate-200 rounded w-16" />
                  </td>
                  <td className="py-3.5 px-4 hidden sm:table-cell">
                    <div className="h-5 bg-slate-200 rounded-full w-24" />
                  </td>
                  <td className="py-3.5 px-4 hidden md:table-cell">
                    <div className="h-4 bg-slate-200 rounded w-14" />
                  </td>
                  <td className="py-3.5 px-4 hidden lg:table-cell">
                    <div className="h-3.5 bg-slate-200 rounded w-20" />
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-right">
                    <div className="h-7 bg-slate-200 rounded w-20 ml-auto" />
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
      <div className="w-full py-14 px-4 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No files found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
          Your cloud vault is ready. Upload your first document, image, or media asset to begin.
        </p>
        <button
          onClick={onOpenUpload}
          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          Upload Files
        </button>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 sm:px-6">Name</th>
              <th className="py-3.5 px-4">Size</th>
              <th className="py-3.5 px-4 hidden sm:table-cell">Uploaded By</th>
              <th className="py-3.5 px-4 hidden md:table-cell">Category</th>
              <th className="py-3.5 px-4 hidden lg:table-cell">Date</th>
              <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
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
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                >
                  {/* Filename & Icon */}
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 shrink-0">
                        <FileIcon
                          category={file.category}
                          mimeType={file.contentType}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="min-w-0 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
                        <p className="font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-colors">
                          {file.originalName}
                        </p>
                        <p className="text-[11px] text-slate-500 sm:hidden">
                          by <span className="font-semibold text-slate-700">@{file.uploadedBy || "User"}</span> • {formatRelativeTime(file.lastModified)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Size */}
                  <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {formatBytes(file.size)}
                  </td>

                  {/* Uploaded By */}
                  <td className="py-3 px-4 hidden sm:table-cell whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      <div className="w-4 h-4 rounded-full bg-sky-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                        {(file.uploadedBy || "User").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800 text-xs">
                        @{file.uploadedBy || "User"}
                      </span>
                    </div>
                  </td>

                  {/* Category / MIME */}
                  <td className="py-3 px-4 hidden md:table-cell whitespace-nowrap">
                    <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {file.category}
                    </span>
                  </td>

                  {/* Upload Date */}
                  <td className="py-3 px-4 hidden lg:table-cell text-slate-500 whitespace-nowrap">
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
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isPreviewable
                            ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 cursor-pointer shadow-xs"
                            : "border-transparent text-slate-300 cursor-not-allowed opacity-40"
                        }`}
                        title={isPreviewable ? "Preview file" : "Preview not supported"}
                        aria-label="Preview file"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Download Button */}
                      <button
                        onClick={() => onDownload(file)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-sky-50 hover:border-sky-200 text-slate-600 hover:text-sky-600 transition-colors cursor-pointer shadow-xs"
                        title="Download file"
                        aria-label="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button (Only file owner or admin can delete) */}
                      {canDelete && (
                        <button
                          onClick={() => onDelete(file)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shadow-xs"
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

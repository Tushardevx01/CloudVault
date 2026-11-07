"use client";

import React from "react";
import { Eye, Download, Trash2, Copy, Check, FileQuestion } from "lucide-react";
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
}

export function FileList({
  files,
  isLoading,
  onPreview,
  onDownload,
  onDelete,
  onOpenUpload,
}: FileListProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopyKey = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 sm:px-6">Name</th>
                <th className="py-3.5 px-4">Size</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Type</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">Uploaded</th>
                <th className="py-3.5 px-4 hidden xl:table-cell">Storage Key</th>
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
                  <td className="py-3.5 px-4 hidden md:table-cell">
                    <div className="h-4 bg-slate-200 rounded w-14" />
                  </td>
                  <td className="py-3.5 px-4 hidden lg:table-cell">
                    <div className="h-3.5 bg-slate-200 rounded w-20" />
                  </td>
                  <td className="py-3.5 px-4 hidden xl:table-cell">
                    <div className="h-3.5 bg-slate-200 rounded w-36" />
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
              <th className="py-3.5 px-4 hidden md:table-cell">Category</th>
              <th className="py-3.5 px-4 hidden lg:table-cell">Uploaded</th>
              <th className="py-3.5 px-4 hidden xl:table-cell">Storage Key</th>
              <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {files.map((file) => {
              const isPreviewable =
                file.category === "image" ||
                file.originalName.toLowerCase().endsWith(".pdf") ||
                file.category === "code";

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
                        <p className="text-[11px] text-slate-500 lg:hidden">
                          {formatRelativeTime(file.lastModified)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Size */}
                  <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {formatBytes(file.size)}
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

                  {/* S3 Object Key */}
                  <td className="py-3 px-4 hidden xl:table-cell max-w-xs text-[11px] font-mono text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[200px]" title={file.key}>
                        {file.key}
                      </span>
                      <button
                        onClick={(e) => handleCopyKey(file.key, e)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 shrink-0 transition-colors"
                        title="Copy S3 Key"
                        aria-label="Copy S3 key"
                      >
                        {copiedKey === file.key ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
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
                        title="Download from Amazon S3"
                        aria-label="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => onDelete(file)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer shadow-xs"
                        title="Delete from Amazon S3"
                        aria-label="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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

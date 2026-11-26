"use client";

import React from "react";
import { Eye, Download, Trash2, Calendar, HardDrive, FileQuestion } from "lucide-react";
import { S3FileItem } from "@/types/file";
import { FileIcon } from "./FileIcon";
import { formatBytes, formatRelativeTime } from "@/lib/utils";

interface FileGridProps {
  files: S3FileItem[];
  isLoading?: boolean;
  onPreview: (file: S3FileItem) => void;
  onDownload: (file: S3FileItem) => void;
  onDelete: (file: S3FileItem) => void;
  onOpenUpload?: () => void;
  currentUsername?: string;
  isAdmin?: boolean;
}

export function FileGrid({
  files,
  isLoading,
  onPreview,
  onDownload,
  onDelete,
  onOpenUpload,
  currentUsername,
  isAdmin = false,
}: FileGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-3xl bg-white/90 backdrop-blur-md border border-white animate-pulse space-y-4 shadow-[0_4px_20px_rgba(150,175,205,0.08)]"
          >
            <div className="flex justify-between items-center">
              <div className="w-14 h-4 bg-[#F6F9FC] rounded-full" />
              <div className="w-12 h-4 bg-[#F6F9FC] rounded-full" />
            </div>
            <div className="py-6 flex justify-center">
              <div className="w-14 h-14 bg-[#F6F9FC] rounded-2xl" />
            </div>
            <div className="pt-3 border-t border-[#E3EAF0]/60 space-y-2">
              <div className="h-3.5 bg-[#E3EAF0] rounded w-3/4" />
              <div className="h-3 bg-[#F6F9FC] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="py-16 px-4 text-center rounded-3xl bg-white/90 backdrop-blur-md border border-white shadow-[0_4px_20px_rgba(150,175,205,0.08)] col-span-full">
        <div className="w-14 h-14 rounded-2xl bg-[#D8EEFF] border border-[#8CBCE8]/40 flex items-center justify-center mx-auto mb-4 text-[#20628E] shadow-2xs">
          <FileQuestion className="w-7 h-7 text-[#8CBCE8]" />
        </div>
        <h3 className="text-base font-bold text-[#29343D]">No files found</h3>
        <p className="text-xs text-[#7A8792] max-w-sm mx-auto mt-1 mb-5">
          Your cloud vault is ready. Upload your first document, image, or media asset to begin.
        </p>
        {onOpenUpload && (
          <button
            onClick={onOpenUpload}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#8CBCE8] to-[#A399F0] hover:opacity-95 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(140,188,232,0.3)] transition-all cursor-pointer"
          >
            Upload Files
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
          <div
            key={file.key}
            onClick={() => onPreview(file)}
            className="group p-4 rounded-3xl bg-white/90 backdrop-blur-md border border-white shadow-[0_4px_20px_rgba(150,175,205,0.08)] hover:shadow-[0_8px_25px_rgba(150,175,205,0.16)] hover:border-[#8CBCE8]/50 transition-all flex flex-col justify-between cursor-pointer"
          >
            {/* Top row: Category badge & Actions */}
            <div className="flex items-center justify-between mb-3">
              <span className="capitalize px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#DDF3E4] text-[#1E633C] border border-[#BCE6CE]">
                {file.category}
              </span>
              <div
                className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                {isPreviewable && (
                  <button
                    onClick={() => onPreview(file)}
                    className="w-7 h-7 rounded-full hover:bg-[#D8EEFF] text-[#7A8792] hover:text-[#20628E] transition-colors flex items-center justify-center cursor-pointer"
                    title="Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onDownload(file)}
                  className="w-7 h-7 rounded-full hover:bg-[#DDF3E4] text-[#7A8792] hover:text-[#1E633C] transition-colors flex items-center justify-center cursor-pointer"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {canDelete && (
                  <button
                    onClick={() => onDelete(file)}
                    className="w-7 h-7 rounded-full hover:bg-rose-50 text-[#7A8792] hover:text-rose-600 transition-colors flex items-center justify-center cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Center: Large Icon */}
            <div className="py-6 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#E3EAF0] shadow-2xs flex items-center justify-center group-hover:scale-105 group-hover:bg-[#D8EEFF]/40 group-hover:border-[#8CBCE8]/40 transition-all">
                <FileIcon
                  category={file.category}
                  mimeType={file.contentType}
                  className="w-7 h-7"
                />
              </div>
            </div>

            {/* Bottom: Name, Uploader & Meta */}
            <div className="mt-2 pt-3 border-t border-[#E3EAF0]/60 space-y-2">
              <div>
                <p
                  className="text-xs font-semibold text-[#29343D] truncate group-hover:text-[#20628E] transition-colors"
                  title={file.originalName}
                >
                  {file.originalName}
                </p>
                <div className="flex items-center justify-between text-[11px] text-[#7A8792] mt-1">
                  <span className="font-mono">{formatBytes(file.size)}</span>
                  <span>{formatRelativeTime(file.lastModified)}</span>
                </div>
              </div>

              {/* Uploader Pill */}
              <div className="flex items-center justify-between pt-1 text-[10px]">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E6E1FA]/70 text-[#29343D] border border-white">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#8CBCE8] text-white font-bold flex items-center justify-center text-[8px]">
                    {(file.uploadedBy || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[80px]">
                    @{file.uploadedBy || "User"}
                  </span>
                </div>
                <span className="font-mono text-[#7A8792]">AWS S3</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

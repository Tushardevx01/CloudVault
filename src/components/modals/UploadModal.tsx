"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Cloud,
} from "lucide-react";
import { formatBytes, getFileCategory } from "@/lib/utils";
import { FileIcon } from "../files/FileIcon";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_FORMATTED } from "@/lib/constants";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  onAddToast: (toast: {
    type: "success" | "error" | "info";
    title: string;
    message?: string;
  }) => void;
  currentUsername?: string;
}

interface QueuedFile {
  id: string;
  file: File;
  status: "idle" | "uploading" | "success" | "error";
  errorMessage?: string;
}

export function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  onAddToast,
}: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoCloseTimer = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearAutoCloseTimer();
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isUploading) return;
    clearAutoCloseTimer();
    setQueue([]);
    onClose();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: QueuedFile[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        onAddToast({
          type: "error",
          title: "File Exceeds Limit",
          message: `${file.name} is larger than the ${MAX_FILE_SIZE_FORMATTED} limit.`,
        });
        return;
      }

      if (file.size === 0) {
        onAddToast({
          type: "error",
          title: "Empty File",
          message: `${file.name} is empty and cannot be uploaded.`,
        });
        return;
      }

      newItems.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        status: "idle",
      });
    });

    setQueue((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeQueuedFile = (id: string) => {
    if (isUploading) return;
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    if (isUploading) return;
    setQueue([]);
  };

  const pendingItems = queue.filter(
    (item) => item.status === "idle" || item.status === "error"
  );

  const startUpload = async () => {
    if (pendingItems.length === 0) return;

    clearAutoCloseTimer();
    const pendingIndexById = new Map(
      pendingItems.map((item, index) => [item.id, index])
    );
    const pendingIds = new Set(pendingItems.map((i) => i.id));
    setIsUploading(true);

    const formData = new FormData();
    pendingItems.forEach((item) => {
      formData.append("files", item.file);
    });

    setQueue((prev) =>
      prev.map((item) =>
        pendingIds.has(item.id)
          ? { ...item, status: "uploading", errorMessage: undefined }
          : item
      )
    );

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      const errorList: { index?: number; name: string; error: string }[] =
        result.errors || result.details || [];
      const errorByIndex = new Map<number, string>();
      const errorByName = new Map<string, string>();
      for (const entry of errorList) {
        if (typeof entry.index === "number") {
          errorByIndex.set(entry.index, entry.error);
        }
        errorByName.set(entry.name, entry.error);
      }

      const resolveItemError = (item: QueuedFile) => {
        const idx = pendingIndexById.get(item.id);
        if (typeof idx === "number" && errorByIndex.has(idx)) {
          return errorByIndex.get(idx);
        }
        if (errorByIndex.size === 0) {
          return errorByName.get(item.file.name);
        }
        return undefined;
      };

      if (response.ok && result.success) {
        const successCount = result.uploaded?.length || 0;

        setQueue((prev) =>
          prev.map((item) => {
            if (!pendingIds.has(item.id)) return item;
            const itemError = resolveItemError(item);
            if (itemError) {
              return { ...item, status: "error", errorMessage: itemError };
            }
            return { ...item, status: "success", errorMessage: undefined };
          })
        );

        if (errorList.length > 0) {
          onAddToast({
            type: "info",
            title: "Partial Upload Completed",
            message: `${successCount} uploaded, ${errorList.length} failed. Review errors in the queue.`,
          });
          onUploadSuccess();
        } else {
          onAddToast({
            type: "success",
            title: "Upload Completed",
            message: `Successfully uploaded ${successCount} file(s) to your cloud vault.`,
          });
          onUploadSuccess();
          autoCloseTimerRef.current = setTimeout(() => {
            autoCloseTimerRef.current = null;
            onClose();
            setQueue([]);
          }, 900);
        }
      } else {
        setQueue((prev) =>
          prev.map((item) =>
            pendingIds.has(item.id)
              ? {
                  ...item,
                  status: "error",
                  errorMessage:
                    resolveItemError(item) ||
                    result.error ||
                    "Upload failed.",
                }
              : item
          )
        );
        onAddToast({
          type: "error",
          title: "Upload Error",
          message:
            result.error || "Could not complete upload to cloud storage.",
        });
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setQueue((prev) =>
        prev.map((item) =>
          pendingIds.has(item.id)
            ? {
                ...item,
                status: "error",
                errorMessage: error.message || "Network error.",
              }
            : item
        )
      );
      onAddToast({
        type: "error",
        title: "Network Error",
        message: "Failed to connect to upload endpoint.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const totalQueuedBytes = queue.reduce((acc, curr) => acc + curr.file.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#263747]/25 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border border-[#E3EAF0] rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3EAF0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DCEEFF] border border-[#B9DDF7] flex items-center justify-center text-[#20628E] shadow-2xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#263747] tracking-tight">
                Upload Files
              </h2>
              <p className="text-xs text-[#718096]">
                Add documents, media, or archives to your vault (up to{" "}
                {MAX_FILE_SIZE_FORMATTED} each)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-[#718096] hover:text-[#263747] hover:bg-[#F6F9FC] transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
              dragActive
                ? "border-[#78BCE8] bg-[#DCEEFF]/40 scale-[0.99]"
                : "border-[#B9DDF7] hover:border-[#78BCE8] bg-[#F6F9FC]/70 hover:bg-[#DCEEFF]/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-[#DCEEFF] border border-[#B9DDF7] flex items-center justify-center text-[#20628E] mb-3 shadow-2xs">
              <UploadCloud className="w-6 h-6 text-[#78BCE8]" />
            </div>
            <p className="text-sm font-semibold text-[#263747]">
              Drag and drop files here, or{" "}
              <span className="text-[#3B9EE0] underline underline-offset-2">
                browse files
              </span>
            </p>
            <p className="text-xs text-[#718096] mt-1">
              Supports multiple files up to {MAX_FILE_SIZE_FORMATTED} each.
              Encrypted at rest.
            </p>
          </div>

          {/* Queue List */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#718096] px-1">
                <span>
                  Files in queue: {queue.length} ({formatBytes(totalQueuedBytes)}
                  )
                </span>
                {!isUploading && (
                  <button
                    onClick={clearQueue}
                    className="text-rose-600 hover:text-rose-700 font-medium transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {queue.map((item) => {
                  const category = getFileCategory(
                    item.file.name,
                    item.file.type
                  );
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#F6F9FC] border border-[#E3EAF0] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FileIcon
                          category={category}
                          mimeType={item.file.type}
                          className="w-4 h-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#263747] truncate">
                            {item.file.name}
                          </p>
                          <p className="text-[11px] text-[#718096] font-mono">
                            {formatBytes(item.file.size)}
                            {item.errorMessage ? ` • ${item.errorMessage}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === "uploading" && (
                          <span className="flex items-center gap-1 text-[#3B9EE0] font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading...</span>
                          </span>
                        )}
                        {item.status === "success" && (
                          <span className="flex items-center gap-1 text-[#1E633C] bg-[#DDF3E4] px-2 py-0.5 rounded-full font-medium text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#72C99A]" />
                            <span>Uploaded</span>
                          </span>
                        )}
                        {item.status === "error" && (
                          <span
                            className="flex items-center gap-1 text-rose-600 font-medium"
                            title={item.errorMessage}
                          >
                            <AlertCircle className="w-4 h-4" />
                            <span>Failed</span>
                          </span>
                        )}
                        {(item.status === "idle" || item.status === "error") &&
                          !isUploading && (
                            <button
                              onClick={() => removeQueuedFile(item.id)}
                              className="p-1 rounded text-[#718096] hover:text-rose-600 transition-colors cursor-pointer"
                              aria-label="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E3EAF0] bg-[#F6F9FC] flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#263747] border border-[#E3EAF0] bg-white hover:bg-[#F6F9FC] transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            onClick={startUpload}
            disabled={isUploading || pendingItems.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#78BCE8] hover:bg-[#3B9EE0] active:bg-[#20628E] disabled:bg-[#E3EAF0] disabled:text-[#718096] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading files...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>
                  {queue.some((q) => q.status === "error")
                    ? `Retry Failed (${pendingItems.length})`
                    : `Upload ${pendingItems.length > 0 ? `(${pendingItems.length})` : ""}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

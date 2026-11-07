"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Cloud,
  User,
} from "lucide-react";
import { formatBytes, getFileCategory } from "@/lib/utils";
import { FileIcon } from "../files/FileIcon";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";

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
  currentUsername,
}: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaderName, setUploaderName] = useState(currentUsername || "User");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUsername) {
      setUploaderName(currentUsername);
      return;
    }
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("cloudvault_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.username || parsed.name) {
            setUploaderName(parsed.username || parsed.name);
            return;
          }
        } catch {
          // ignore
        }
      }
      const savedName = localStorage.getItem("cloudvault_uploader_name");
      if (savedName && savedName.trim()) {
        setUploaderName(savedName.trim());
      }
    }
  }, [currentUsername, isOpen]);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: QueuedFile[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        onAddToast({
          type: "error",
          title: "File Exceeds Limit",
          message: `${file.name} is larger than the 50MB limit.`,
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

  const startUpload = async () => {
    const pendingFiles = queue.filter((item) => item.status === "idle");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("userName", uploaderName.trim() || "User");
    pendingFiles.forEach((item) => {
      formData.append("files", item.file);
    });

    setQueue((prev) =>
      prev.map((item) =>
        item.status === "idle" ? { ...item, status: "uploading" } : item
      )
    );

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const successCount = result.uploaded?.length || pendingFiles.length;
        setQueue((prev) =>
          prev.map((item) => ({ ...item, status: "success" }))
        );
        onAddToast({
          type: "success",
          title: "Upload Completed",
          message: `Successfully uploaded ${successCount} file(s) to your cloud vault.`,
        });
        onUploadSuccess();
        setTimeout(() => {
          onClose();
          setQueue([]);
        }, 1000);
      } else {
        setQueue((prev) =>
          prev.map((item) => ({
            ...item,
            status: "error",
            errorMessage: result.error || "Upload failed.",
          }))
        );
        onAddToast({
          type: "error",
          title: "Upload Error",
          message: result.error || "Could not complete upload to cloud storage.",
        });
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setQueue((prev) =>
        prev.map((item) => ({
          ...item,
          status: "error",
          errorMessage: error.message || "Network error.",
        }))
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Upload Files
              </h2>
              <p className="text-xs text-slate-500">
                Add documents, media, or archives to your secure vault (up to 50MB each)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Uploader Name Field */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-sky-600" />
              <label htmlFor="uploaderName" className="text-xs font-semibold text-slate-700">
                Uploading As:
              </label>
            </div>
            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
              <input
                id="uploaderName"
                type="text"
                value={uploaderName}
                onChange={(e) => {
                  const val = e.target.value;
                  setUploaderName(val);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("cloudvault_uploader_name", val);
                  }
                }}
                placeholder="User Name"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-100 transition-colors"
              />
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
              dragActive
                ? "border-sky-500 bg-sky-50 scale-[0.99]"
                : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-3 shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Drag and drop files here, or{" "}
              <span className="text-sky-600 underline underline-offset-2">
                browse
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports multiple files up to 50MB each. Securely stored with private access control.
            </p>
          </div>

          {/* Queue List */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Files to upload: {queue.length} ({formatBytes(totalQueuedBytes)})
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
                  const category = getFileCategory(item.file.name, item.file.type);
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FileIcon
                          category={category}
                          mimeType={item.file.type}
                          className="w-4 h-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">
                            {item.file.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {formatBytes(item.file.size)}
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === "uploading" && (
                          <span className="flex items-center gap-1 text-sky-600 font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading...</span>
                          </span>
                        )}
                        {item.status === "success" && (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
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
                        {item.status === "idle" && !isUploading && (
                          <button
                            onClick={() => removeQueuedFile(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
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
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={startUpload}
            disabled={isUploading || queue.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading files...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Upload {queue.length > 0 ? `(${queue.length})` : ""}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

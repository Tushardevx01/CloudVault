"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Download,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { S3FileItem } from "@/types/file";
import { FileIcon } from "../files/FileIcon";
import { formatBytes, formatDate } from "@/lib/utils";

interface FilePreviewModalProps {
  file: S3FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: S3FileItem) => void;
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onDownload,
}: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (!isOpen || !file) {
      setPreviewUrl(null);
      setPreviewError(null);
      return;
    }

    const isPreviewable =
      file.category === "image" ||
      file.originalName.toLowerCase().endsWith(".pdf") ||
      file.category === "code";

    if (!isPreviewable) {
      return;
    }

    let isMounted = true;
    setIsLoadingPreview(true);
    setPreviewError(null);

    fetch(
      `/api/files/preview?key=${encodeURIComponent(file.key)}&name=${encodeURIComponent(file.originalName)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.success && data.previewUrl) {
            setPreviewUrl(data.previewUrl);
          } else {
            setPreviewError(data.error || "Unable to generate preview.");
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setPreviewError(err.message || "Failed to load preview.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const isImage = file.category === "image";
  const isPdf = file.originalName.toLowerCase().endsWith(".pdf");

  const copyKeyToClipboard = () => {
    navigator.clipboard.writeText(file.key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
              <FileIcon
                category={file.category}
                mimeType={file.contentType}
                className="w-5 h-5"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {file.originalName}
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span className="capitalize">{file.category}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDownload(file)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-[260px] max-h-[500px]">
          {isLoadingPreview ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
              <p className="text-xs font-medium">Generating secure preview...</p>
            </div>
          ) : previewError ? (
            <div className="text-center py-10 px-4">
              <p className="text-rose-600 text-xs font-semibold mb-2">{previewError}</p>
              <p className="text-slate-500 text-xs">
                You can still download the original file directly.
              </p>
            </div>
          ) : isImage && previewUrl ? (
            <div className="relative max-h-full max-w-full flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={file.originalName}
                className="max-h-[380px] max-w-full object-contain rounded-xl shadow-md border border-slate-200"
              />
            </div>
          ) : isPdf && previewUrl ? (
            <div className="w-full h-[400px] rounded-xl overflow-hidden border border-slate-200">
              <iframe
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-full bg-white"
                title={`Preview ${file.originalName}`}
              />
            </div>
          ) : (
            <div className="text-center py-12 px-4 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400 shadow-xs">
                <FileIcon
                  category={file.category}
                  mimeType={file.contentType}
                  className="w-8 h-8"
                />
              </div>
              <p className="text-sm font-bold text-slate-900">
                Inline preview not available for this format
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                This file is securely stored in your vault. Download the file to view it on your device.
              </p>
              <button
                onClick={() => onDownload(file)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-sky-600" />
                <span>Download ({formatBytes(file.size)})</span>
              </button>
            </div>
          )}
        </div>

        {/* Metadata Details Drawer */}
        <div className="p-6 border-t border-slate-100 bg-white space-y-3">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>File Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block mb-1">
                Uploaded By
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {(file.uploadedBy || "User").charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-slate-800 text-xs">
                  @{file.uploadedBy || "User"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block mb-1">
                Storage Key
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-slate-800 truncate" title={file.key}>
                  {file.key}
                </span>
                <button
                  onClick={copyKeyToClipboard}
                  className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
                  title="Copy Key"
                >
                  {copiedKey ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block mb-1">
                MIME Content-Type
              </span>
              <span className="font-mono text-slate-800">
                {file.contentType || "application/octet-stream"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block mb-1">
                Uploaded Date
              </span>
              <span className="font-mono text-slate-800">
                {formatDate(file.lastModified)}
              </span>
            </div>

            {file.eTag && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 text-[11px] block mb-1">
                  ETag / Checksum
                </span>
                <span className="font-mono text-slate-800 truncate block">
                  {file.eTag}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

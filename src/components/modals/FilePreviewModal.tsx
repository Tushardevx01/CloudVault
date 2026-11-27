"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Download, Loader2, Copy, Check } from "lucide-react";
import { S3FileItem } from "@/types/file";
import { FileIcon } from "../files/FileIcon";
import {
  formatBytes,
  formatDate,
  isFilePreviewable,
  isTextPreviewFile,
} from "@/lib/utils";

async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to execCommand on restricted/insecure HTTP contexts
    }
  }
  if (typeof document === "undefined") return false;
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

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
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textTruncated, setTextTruncated] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const copyKeyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyContentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyKeyTimerRef.current) clearTimeout(copyKeyTimerRef.current);
      if (copyContentTimerRef.current) clearTimeout(copyContentTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !file) {
      setPreviewUrl(null);
      setTextContent(null);
      setTextTruncated(false);
      setPreviewError(null);
      return;
    }

    if (!isFilePreviewable(file.originalName, file.category)) {
      setPreviewUrl(null);
      setTextContent(null);
      setTextTruncated(false);
      setPreviewError(null);
      return;
    }

    const isText = isTextPreviewFile(file.originalName, file.category);
    const controller = new AbortController();

    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreviewUrl(null);
    setTextContent(null);
    setTextTruncated(false);

    const endpoint = `/api/files/preview?key=${encodeURIComponent(file.key)}${isText ? "&text=true" : ""}`;

    fetch(endpoint, { signal: controller.signal })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.success) {
          setPreviewError(data.error || "Unable to generate preview.");
          return;
        }
        if (isText && typeof data.content === "string") {
          setTextContent(data.content);
          setTextTruncated(Boolean(data.truncated));
        } else if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
        } else {
          setPreviewError("Preview payload unavailable.");
        }
      })
      .catch((err: unknown) => {
        const error = err as { name?: string; message?: string };
        if (error.name !== "AbortError") {
          setPreviewError(error.message || "Failed to load preview.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingPreview(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const isImage = file.category === "image";
  const isPdf = file.originalName.toLowerCase().endsWith(".pdf");
  const isText = isTextPreviewFile(file.originalName, file.category);

  const copyKeyToClipboard = async () => {
    const copied = await copyTextSafe(file.key);
    if (!copied) return;
    setCopiedKey(true);
    if (copyKeyTimerRef.current) clearTimeout(copyKeyTimerRef.current);
    copyKeyTimerRef.current = setTimeout(() => setCopiedKey(false), 2000);
  };

  const copyTextContent = async () => {
    if (textContent === null) return;
    const copied = await copyTextSafe(textContent);
    if (!copied) return;
    setCopiedContent(true);
    if (copyContentTimerRef.current) clearTimeout(copyContentTimerRef.current);
    copyContentTimerRef.current = setTimeout(() => setCopiedContent(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#263747]/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-[#E3EAF0] rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3EAF0] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="p-2.5 rounded-xl bg-[#DCEEFF] border border-[#B9DDF7] shrink-0">
              <FileIcon
                category={file.category}
                mimeType={file.contentType}
                className="w-5 h-5"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#263747] truncate">
                {file.originalName}
              </h2>
              <p className="text-xs text-[#718096] flex items-center gap-2">
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span className="capitalize">{file.category}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDownload(file)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#78BCE8] hover:bg-[#3B9EE0] active:bg-[#20628E] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#718096] hover:text-[#263747] hover:bg-[#F6F9FC] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-[#F6F9FC] min-h-[260px] max-h-[500px]">
          {isLoadingPreview ? (
            <div className="flex flex-col items-center gap-3 py-12 text-[#718096]">
              <Loader2 className="w-8 h-8 animate-spin text-[#78BCE8]" />
              <p className="text-xs font-medium">
                Generating secure preview...
              </p>
            </div>
          ) : previewError ? (
            <div className="text-center py-10 px-4">
              <p className="text-rose-600 text-xs font-semibold mb-2">
                {previewError}
              </p>
              <p className="text-[#718096] text-xs">
                You can still download the original file directly.
              </p>
            </div>
          ) : isImage && previewUrl ? (
            <div className="relative max-h-full max-w-full flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={file.originalName}
                onError={() =>
                  setPreviewError("Image failed to load from preview URL.")
                }
                className="max-h-[380px] max-w-full object-contain rounded-2xl shadow-sm border border-[#E3EAF0]"
              />
            </div>
          ) : isPdf && previewUrl ? (
            <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-[#E3EAF0] shadow-2xs">
              <iframe
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-full bg-white"
                title={`Preview ${file.originalName}`}
              />
            </div>
          ) : isText && textContent !== null ? (
            <div className="w-full rounded-2xl border border-[#E3EAF0] bg-white overflow-hidden shadow-2xs flex flex-col max-h-[420px]">
              <div className="px-4 py-2 bg-[#F6F9FC] border-b border-[#E3EAF0] flex items-center justify-between text-[11px] text-[#718096]">
                <span className="font-mono">
                  {textTruncated
                    ? "Showing first 512 KB of file"
                    : `${textContent.split("\n").length} line(s)`}
                </span>
                <button
                  onClick={copyTextContent}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#E3EAF0] text-[#263747] hover:bg-[#DCEEFF]/40 transition-colors cursor-pointer font-semibold"
                >
                  {copiedContent ? (
                    <>
                      <Check className="w-3 h-3 text-[#72C99A]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-[#263747] overflow-auto whitespace-pre-wrap break-words leading-relaxed">
                <code>{textContent || "(Empty text content)"}</code>
              </pre>
            </div>
          ) : (
            <div className="text-center py-12 px-4 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#E3EAF0] flex items-center justify-center mx-auto mb-3 text-[#718096] shadow-2xs">
                <FileIcon
                  category={file.category}
                  mimeType={file.contentType}
                  className="w-8 h-8"
                />
              </div>
              <p className="text-sm font-bold text-[#263747]">
                Inline preview not available for this format
              </p>
              <p className="text-xs text-[#718096] mt-1 mb-4">
                This file is securely stored in your vault. Download the file to
                view it on your device.
              </p>
              <button
                onClick={() => onDownload(file)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#F6F9FC] text-[#263747] border border-[#E3EAF0] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#78BCE8]" />
                <span>Download ({formatBytes(file.size)})</span>
              </button>
            </div>
          )}
        </div>

        {/* Metadata Details Drawer */}
        <div className="p-6 border-t border-[#E3EAF0] bg-white space-y-3">
          <div className="text-xs text-[#718096] font-semibold uppercase tracking-wider">
            <span>File Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#F6F9FC] border border-[#E3EAF0]">
              <span className="text-[#718096] text-[11px] block mb-1">
                Uploaded By
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[#DCEEFF] text-[#20628E] text-[10px] font-bold flex items-center justify-center shrink-0">
                  {(file.uploadedBy || "User").charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-[#263747] text-xs">
                  @{file.uploadedBy || "User"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F9FC] border border-[#E3EAF0]">
              <span className="text-[#718096] text-[11px] block mb-1">
                Storage Key
              </span>
              <div className="flex items-center justify-between gap-2">
                <span
                  className="font-mono text-[#263747] truncate"
                  title={file.key}
                >
                  {file.key}
                </span>
                <button
                  onClick={copyKeyToClipboard}
                  className="p-1 rounded hover:bg-[#E3EAF0] text-[#718096] hover:text-[#263747] shrink-0 cursor-pointer"
                  title="Copy Key"
                >
                  {copiedKey ? (
                    <Check className="w-3.5 h-3.5 text-[#72C99A]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F9FC] border border-[#E3EAF0]">
              <span className="text-[#718096] text-[11px] block mb-1">
                MIME Content-Type
              </span>
              <span className="font-mono text-[#263747]">
                {file.contentType || "application/octet-stream"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F9FC] border border-[#E3EAF0]">
              <span className="text-[#718096] text-[11px] block mb-1">
                Uploaded Date
              </span>
              <span className="font-mono text-[#263747]">
                {formatDate(file.lastModified)}
              </span>
            </div>

            {file.eTag && (
              <div className="p-3 rounded-xl bg-[#F6F9FC] border border-[#E3EAF0]">
                <span className="text-[#718096] text-[11px] block mb-1">
                  ETag / Checksum
                </span>
                <span className="font-mono text-[#263747] truncate block">
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

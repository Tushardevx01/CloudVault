"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { S3FileItem } from "@/types/file";
import { formatBytes } from "@/lib/utils";

interface DeleteConfirmModalProps {
  file: S3FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: S3FileItem) => Promise<void>;
}

export function DeleteConfirmModal({
  file,
  isOpen,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !file) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(file);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Warning Icon Header */}
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          Delete File?
        </h3>
        <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
          This operation will permanently remove this file from your cloud vault. This action cannot be reversed.
        </p>

        {/* File preview summary */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-6 text-xs space-y-1.5">
          <div className="font-semibold text-slate-900 truncate">
            {file.originalName}
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Size: {formatBytes(file.size)}</span>
            <span className="font-mono truncate max-w-[180px]">{file.key}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

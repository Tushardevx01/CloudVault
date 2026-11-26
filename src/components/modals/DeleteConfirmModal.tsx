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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#263747]/25 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-[#E3EAF0] rounded-3xl shadow-xl p-6 overflow-hidden">
        {/* Warning Icon Header */}
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-4 shadow-2xs">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-[#263747] tracking-tight">
          Delete File Permanently?
        </h3>
        <p className="text-xs text-[#718096] mt-1 mb-4 leading-relaxed">
          This operation will permanently remove this object from your cloud vault. This action cannot be reversed.
        </p>

        {/* File preview summary */}
        <div className="p-3.5 rounded-xl bg-[#F6F9FC] border border-[#E3EAF0] mb-6 text-xs space-y-1.5">
          <div className="font-semibold text-[#263747] truncate">
            {file.originalName}
          </div>
          <div className="flex items-center justify-between text-[#718096] text-[11px]">
            <span>Size: {formatBytes(file.size)}</span>
            <span className="font-mono truncate max-w-[180px]">{file.key}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#263747] border border-[#E3EAF0] bg-white hover:bg-[#F6F9FC] transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
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

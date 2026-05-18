"use client";

import { AlertTriangle, CheckCircle, Info, XCircle, X } from "lucide-react";
import { useEffect } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "info" | "warning" | "success" | "danger";
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info",
  loading = false,
}: ConfirmDialogProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-12 h-12 text-amber-400" />;
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-400" />;
      case "danger":
        return <XCircle className="w-12 h-12 text-red-400" />;
      default:
        return <Info className="w-12 h-12 text-blue-400" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "warning":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          iconBg: "bg-amber-500/20",
          confirmBg: "bg-amber-500 hover:bg-amber-600",
        };
      case "success":
        return {
          bg: "bg-green-500/10",
          border: "border-green-500/30",
          iconBg: "bg-green-500/20",
          confirmBg: "bg-green-500 hover:bg-green-600",
        };
      case "danger":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          iconBg: "bg-red-500/20",
          confirmBg: "bg-red-500 hover:bg-red-600",
        };
      default:
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          iconBg: "bg-blue-500/20",
          confirmBg: "bg-blue-500 hover:bg-blue-600",
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1a1f] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className={`w-16 h-16 ${colors.iconBg} rounded-2xl flex items-center justify-center mb-4`}>
            {getIcon()}
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>

          {/* Message */}
          <p className="text-gray-300 leading-relaxed mb-6">{message}</p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-6 py-3 ${colors.confirmBg} text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                confirmText
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

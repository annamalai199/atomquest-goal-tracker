"use client";

import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useEffect } from "react";

interface NotificationProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export default function Notification({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}: NotificationProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case "error":
        return <XCircle className="w-6 h-6 text-red-400" />;
      case "warning":
        return <AlertTriangle className="w-6 h-6 text-amber-400" />;
      case "info":
        return <Info className="w-6 h-6 text-blue-400" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-500/10",
          border: "border-green-500/30",
          iconBg: "bg-green-500/20",
        };
      case "error":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          iconBg: "bg-red-500/20",
        };
      case "warning":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          iconBg: "bg-amber-500/20",
        };
      case "info":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          iconBg: "bg-blue-500/20",
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`${colors.bg} ${colors.border} border backdrop-blur-xl rounded-xl shadow-2xl p-4 min-w-[320px] max-w-md animate-in slide-in-from-right duration-300`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`${colors.iconBg} rounded-lg p-2 flex-shrink-0`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
          {message && (
            <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              type === "success"
                ? "bg-green-400"
                : type === "error"
                ? "bg-red-400"
                : type === "warning"
                ? "bg-amber-400"
                : "bg-blue-400"
            }`}
            style={{
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

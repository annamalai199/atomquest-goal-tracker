"use client";

import { ButtonHTMLAttributes, ReactNode, useState } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  onClick,
  className = "",
  ...props
}: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const baseStyles = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]";

  const variantStyles = {
    primary: "bg-gradient-to-r from-[#ff4444] to-[#ff6b35] text-white hover:shadow-lg hover:shadow-[#ff4444]/30 focus:ring-[#ff4444] active:scale-[0.98]",
    secondary: "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 focus:ring-white/20 active:scale-[0.98]",
    danger: "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 focus:ring-red-600 active:scale-[0.98]",
    success: "bg-green-600 text-white hover:bg-green-700 hover:shadow-lg hover:shadow-green-600/30 focus:ring-green-600 active:scale-[0.98]",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5 focus:ring-white/20 active:scale-[0.98]",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    
    // Instant visual feedback
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 100);
    
    // Call the original onClick
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? "w-full" : ""}
        ${isPressed ? "scale-[0.96]" : ""}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

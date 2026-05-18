"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import Notification from "./Notification";

interface NotificationData {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message?: string,
    duration?: number
  ) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within NotificationProvider"
    );
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (
      type: "success" | "error" | "warning" | "info",
      title: string,
      message?: string,
      duration: number = 5000
    ) => {
      const id = `notification-${Date.now()}-${Math.random()}`;
      const notification: NotificationData = {
        id,
        type,
        title,
        message,
        duration,
      };

      setNotifications((prev) => [...prev, notification]);
    },
    []
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) => {
      showNotification("success", title, message, duration);
    },
    [showNotification]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) => {
      showNotification("error", title, message, duration);
    },
    [showNotification]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) => {
      showNotification("warning", title, message, duration);
    },
    [showNotification]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) => {
      showNotification("info", title, message, duration);
    },
    [showNotification]
  );

  return (
    <NotificationContext.Provider
      value={{ showNotification, success, error, warning, info }}
    >
      {children}

      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        <div className="flex flex-col gap-3 pointer-events-auto">
          {notifications.map((notification) => (
            <Notification
              key={notification.id}
              {...notification}
              onClose={removeNotification}
            />
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
}

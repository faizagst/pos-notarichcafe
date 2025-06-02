// contexts/NotificationContext.tsx
"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface MyNotification {
  message: string;
  date: string;
  isRead: boolean;
}

interface NotificationContextType {
  notifications: MyNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<MyNotification[]>>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<MyNotification[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("notifications");
    if (stored) {
      const parsed = JSON.parse(stored);
      const updatedNotifications = parsed.map((notif: any) => ({
        ...notif,
        isRead: typeof notif.isRead === "boolean" ? notif.isRead : false,
      }));
      setNotifications(updatedNotifications);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

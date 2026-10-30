"use client";

import { createContext, useContext } from "react";

// Id người dùng lấy sẵn từ layout server, để các truy vấn cần user id không phải chờ tải profile.
const SessionContext = createContext<{ userId: string | null }>({ userId: null });

export function SessionProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={{ userId }}>{children}</SessionContext.Provider>;
}

export function useUserId() {
  return useContext(SessionContext).userId;
}

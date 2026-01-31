"use client";

import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeProvider } from "@upstash/realtime/client";

import { ThemeProvider } from "@/hooks/use-theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider>
      <RealtimeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </RealtimeProvider>
    </ThemeProvider>
  );
}
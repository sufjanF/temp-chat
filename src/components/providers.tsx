"use client"

import { ThemeProvider } from "@/hooks/use-theme"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RealtimeProvider } from "@upstash/realtime/client"
import { useState } from "react"

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ThemeProvider>
      <RealtimeProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </RealtimeProvider>
    </ThemeProvider>
  )
}
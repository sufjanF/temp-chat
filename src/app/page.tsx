"use client"

import { useTheme } from "@/hooks/use-theme"
import { useUsername } from "@/hooks/use-username"
import { client } from "@/lib/client"
import { useMutation } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

const Page = () => {
  return (
    <Suspense>
      <Lobby />
    </Suspense>
  )
}

export default Page

function Lobby() {
  const { username } = useUsername()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  const searchParams = useSearchParams()
  const wasDestroyed = searchParams.get("destroyed") === "true"
  const error = searchParams.get("error")

  const { mutate: createRoom } = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post()

      if (res.status === 200) {
        router.push(`/room/${res.data?.roomId}`)
      }
    },
  })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-grid relative">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 text-[10px] theme-bg-secondary hover:opacity-80 px-3 py-2 theme-text-muted hover:theme-text transition-all flex items-center justify-center theme-border border z-20"
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        {theme === "dark" ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </button>

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        {wasDestroyed && (
          <div className="theme-bg-elevated border border-orange-900/50 p-4 text-center backdrop-blur-sm">
            <p className="text-orange-500 text-xs font-bold tracking-widest">◈ ROOM DESTROYED ◈</p>
            <p className="theme-text-muted text-xs mt-2">
              All messages were permanently deleted.
            </p>
          </div>
        )}
        {error === "room-not-found" && (
          <div className="theme-bg-elevated border border-orange-900/50 p-4 text-center backdrop-blur-sm">
            <p className="text-orange-500 text-xs font-bold tracking-widest">◈ ROOM NOT FOUND ◈</p>
            <p className="theme-text-muted text-xs mt-2">
              This room may have expired or never existed.
            </p>
          </div>
        )}
        {error === "room-full" && (
          <div className="theme-bg-elevated border border-orange-900/50 p-4 text-center backdrop-blur-sm">
            <p className="text-orange-500 text-xs font-bold tracking-widest">◈ ROOM FULL ◈</p>
            <p className="theme-text-muted text-xs mt-2">
              This room is at maximum capacity.
            </p>
          </div>
        )}

        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight theme-text">
            temp<span className="text-orange-500">_</span>chat
          </h1>
          <p className="theme-text-muted text-sm">Messages vanish. Privacy remains.</p>
        </div>

        <div className="theme-border border theme-bg-elevated p-6 backdrop-blur-md glow-accent">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center theme-text-secondary text-xs tracking-wider uppercase">Your Identity</label>

              <div className="flex items-center gap-3">
                <div className="flex-1 theme-bg-input theme-border border p-3 text-sm text-orange-500 font-mono">
                  <span className="theme-text-faint mr-2">@</span>{username}
                </div>
              </div>
            </div>

            <button
              onClick={() => createRoom()}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 text-sm font-bold hover:from-orange-400 hover:to-orange-500 transition-all cursor-pointer disabled:opacity-50 tracking-wider glow-accent-strong"
            >
              INITIALIZE ROOM
            </button>
            
            <p className="theme-text-faint text-[10px] text-center tracking-wide">
              Room self-destructs after 10 minutes
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

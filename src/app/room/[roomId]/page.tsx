"use client"

import { useTheme } from "@/hooks/use-theme"
import { useUsername } from "@/hooks/use-username"
import { client } from "@/lib/client"
import { useRealtime } from "@/lib/realtime-client"
import { useMutation, useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

function formatTimeRemaining(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const Page = () => {
  const params = useParams()
  const roomId = params.roomId as string

  const router = useRouter()

  const { username } = useUsername()
  const { theme, toggleTheme } = useTheme()
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const [copyStatus, setCopyStatus] = useState("COPY")
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isInputFocused, setIsInputFocused] = useState(false)

  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({ query: { roomId } })
      return res.data
    },
  })

  useEffect(() => {
    if (ttlData?.ttl !== undefined) {
      setTimeRemaining(ttlData.ttl)
    }
  }, [ttlData])

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return

    if (timeRemaining === 0) {
      router.push("/?destroyed=true")
      return
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, router])

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } })
      return res.data
    },
  })

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await client.messages.post({ sender: username, text }, { query: { roomId } })

      setInput("")
    },
  })

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event }) => {
      if (event === "chat.message") {
        refetch()
      }

      if (event === "chat.destroy") {
        router.push("/?destroyed=true")
      }
    },
  })

  const { mutate: destroyRoom } = useMutation({
    mutationFn: async () => {
      await client.room.delete(null, { query: { roomId } })
    },
  })

  const copyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopyStatus("COPIED!")
    setTimeout(() => setCopyStatus("COPY"), 2000)
  }

  return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden bg-grid relative">
      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
      
      <header className="theme-border-secondary border-b p-4 flex items-center justify-between theme-bg-elevated backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-5">
          <div className="flex flex-col">
            <span className="text-[10px] theme-text-muted uppercase tracking-wider">Session</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-sm truncate theme-text">{roomId.slice(0, 12)}</span>
              <button
                onClick={copyLink}
                className="text-[9px] theme-bg-secondary hover:opacity-80 px-2 py-0.5 theme-text-muted hover:theme-text transition-colors tracking-wider theme-border border"
              >
                {copyStatus}
              </button>
            </div>
          </div>

          <div className="h-8 w-px theme-border-secondary border-l" />

          <div className="flex flex-col">
            <span className="text-[10px] theme-text-muted uppercase tracking-wider">Countdown</span>
            <span className="text-sm font-bold font-mono mt-0.5 text-orange-500">
              {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="text-[10px] theme-bg-secondary hover:opacity-80 px-3 py-2 theme-text transition-all flex items-center justify-center theme-border border"
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

          <button
            onClick={() => destroyRoom()}
            className="text-[10px] theme-bg-secondary hover-red px-4 py-2 theme-text font-bold transition-all group flex items-center gap-2 disabled:opacity-50 tracking-wider theme-border border"
          >
            <span className="group-hover:animate-pulse">◈</span>
            TERMINATE
          </button>
        </div>
      </header>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
        {messages?.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 theme-border border flex items-center justify-center">
              <span className="theme-text-faint text-lg">◇</span>
            </div>
            <p className="theme-text-faint text-xs tracking-wider uppercase">
              No messages yet
            </p>
          </div>
        )}

        {messages?.messages.map((msg) => (
          <div key={msg.id} className="flex flex-col items-start group">
            <div className="max-w-[80%]">
              <div className="flex items-baseline gap-3 mb-1.5">
                <span
                  className={`text-[10px] font-bold tracking-wider ${
                    msg.sender === username ? "text-orange-500" : "theme-text-secondary"
                  }`}
                >
                  {msg.sender === username ? "YOU" : msg.sender.toUpperCase()}
                </span>

                <span className="text-[10px] theme-text-faint font-mono">
                  {format(msg.timestamp, "HH:mm:ss")}
                </span>
              </div>

              <div className={`text-sm theme-text-secondary leading-relaxed break-all pl-3 border-l-2 ${
                msg.sender === username ? "border-orange-600/40" : "theme-border-secondary"
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 theme-border-secondary border-t theme-bg-elevated backdrop-blur-sm relative z-10">
        <div className="flex gap-3">
          <div className="flex-1 relative group">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 text-xs font-mono ${!isInputFocused ? "animate-pulse" : ""}`}>
              ◈
            </span>
            <input
              autoFocus
              type="text"
              value={input}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  sendMessage({ text: input })
                  inputRef.current?.focus()
                }
              }}
              placeholder="Enter message..."
              onChange={(e) => setInput(e.target.value)}
              className="w-full theme-bg-input theme-border border focus:border-orange-600/50 focus:outline-none transition-colors theme-text placeholder:theme-text-faint py-3 pl-10 pr-4 text-sm"
            />
          </div>

          <button
            onClick={() => {
              sendMessage({ text: input })
              inputRef.current?.focus()
            }}
            disabled={!input.trim() || isPending}
            className="bg-gradient-to-r from-orange-500 to-orange-600 theme-text px-6 text-xs font-bold tracking-wider hover:from-orange-500 hover:to-orange-600 hover-orange-glow transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            SEND
          </button>
        </div>
      </div>
    </main>
  )
}

export default Page

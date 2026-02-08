"use client";

/**
 * @fileoverview Chat room page component for temp_chat.
 * 
 * This module provides the main chat interface where users can:
 * - Send and receive messages in real-time
 * - View countdown timer until room self-destructs
 * - See typing indicators from other users
 * - View read receipts for sent messages
 * - Manually terminate the room
 * - Copy room link for sharing
 * 
 * Real-time functionality is powered by Upstash Realtime,
 * providing instant updates for messages, typing, and read status.
 * 
 * @module app/room/[roomId]/page
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";

import { useTheme } from "@/hooks/use-theme";
import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";
import { useRealtime } from "@/lib/realtime-client";

/**
 * Formats remaining seconds into MM:SS display format.
 * 
 * @param {number} seconds - Total seconds remaining
 * @returns {string} Formatted time string (e.g., "5:30")
 */
function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Structure for tracking message read receipts.
 * @interface ReadReceipt
 */
interface ReadReceipt {
  /** Username of the person who read the message */
  readBy: string;
  /** Unix timestamp when the message was read */
  timestamp: number;
}

/**
 * Main chat room page component.
 * 
 * Manages all chat functionality including:
 * - Message display and sending
 * - Real-time updates via WebSocket
 * - Room countdown timer
 * - Typing indicators
 * - Read receipts
 * - Room termination
 * 
 * @returns {JSX.Element} The chat room interface
 */
export default function Page() {
  // Route parameters and navigation
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();

  // User state hooks
  const { username } = useUsername();
  const { theme, toggleTheme } = useTheme();

  // ==================== UI State ====================
  /** Current input field value */
  const [input, setInput] = useState("");
  /** Copy link button status text */
  const [copyStatus, setCopyStatus] = useState("COPY");
  /** Seconds remaining until room expires */
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  /** Whether the input field is focused */
  const [isInputFocused, setIsInputFocused] = useState(false);
  /** Set of usernames currently typing */
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  /** Map of message IDs to their read receipts */
  const [readReceipts, setReadReceipts] = useState<Map<string, ReadReceipt[]>>(new Map());
  /** ID of message that was just copied (for UI feedback) */
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // ==================== Refs ====================
  /** Reference to input element for focus management */
  const inputRef = useRef<HTMLInputElement>(null);
  /** Timeout for debouncing typing indicator */
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /** Tracks last sent typing state to avoid duplicate API calls */
  const lastTypingStateRef = useRef(false);

  // ==================== Data Fetching ====================
  /**
   * Fetches the room's time-to-live from the server.
   * Used to initialize the countdown timer.
   */
  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({ query: { roomId } });
      return res.data;
    },
  });

  /**
   * Countdown timer effect.
   * Decrements every second and redirects when expired.
   */
  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return;
    // Room has expired - redirect to home with destroyed flag
    if (timeRemaining === 0) {
      router.push("/?destroyed=true");
      return;
    }
    // Decrement countdown every second
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, router]);

  /**
   * Fetches all messages for the current room.
   * Refetched when new messages arrive via realtime.
   */
  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } });
      return res.data;
    },
  });

  // Initialize timeRemaining from TTL data only after messages have loaded,
  // so the countdown doesn't tick while the page is still loading.
  const initialTTL = ttlData?.ttl;
  if (timeRemaining === null && initialTTL !== undefined && messages !== undefined) {
    setTimeRemaining(initialTTL);
  }

  // ==================== Mutations ====================
  /**
   * Sends a new message to the chat room.
   * Clears input and stops typing indicator on success.
   */
  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await client.messages.post({ sender: username, text }, { query: { roomId } });
      setInput("");
      sendTypingIndicator(false);
    },
  });

  /**
   * Broadcasts typing status to other room participants.
   * Debounced to prevent excessive API calls.
   */
  const { mutate: sendTypingIndicator } = useMutation({
    mutationFn: async (isTyping: boolean) => {
      // Skip if state hasn't changed to reduce API calls
      if (lastTypingStateRef.current === isTyping) return;
      lastTypingStateRef.current = isTyping;
      await client.typing.post({ username, isTyping }, { query: { roomId } });
    },
  });

  /**
   * Sends a read receipt for a specific message.
   * Called when viewing messages from other users.
   */
  const { mutate: sendReadReceipt } = useMutation({
    mutationFn: async (messageId: string) => {
      await client.read.post({ messageId, readBy: username }, { query: { roomId } });
    },
  });

  /**
   * Handles typing state with auto-reset after 2 seconds of inactivity.
   * Uses ref-based timeout to properly clear previous timeout.
   */
  const handleTyping = useCallback(() => {
    sendTypingIndicator(true);
    // Clear existing timeout before setting new one
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    // Auto-stop typing indicator after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => sendTypingIndicator(false), 2000);
  }, [sendTypingIndicator]);

  /**
   * Copies message text to clipboard and shows feedback.
   */
  const copyMessage = useCallback((messageId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  // ==================== Realtime Subscription ====================
  /**
   * Subscribes to real-time events for the current room.
   * Handles:
   * - chat.message: New message received
   * - chat.destroy: Room terminated by other user
   * - chat.typing: Typing indicator updates
   * - chat.read: Read receipt notifications
   */
  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy", "chat.typing", "chat.read"],
    onData: ({ event, data }) => {
      // Handle new message - refetch messages and send read receipt
      if (event === "chat.message") {
        refetch();
        const msg = data as { id: string; sender: string };
        // Auto-send read receipt for messages from others
        if (msg.sender !== username) sendReadReceipt(msg.id);
      }
      // Handle room destruction - redirect to home
      if (event === "chat.destroy") {
        router.push("/?destroyed=true");
      }
      // Handle typing indicator updates
      if (event === "chat.typing") {
        const typing = data as { username: string; isTyping: boolean };
        // Only update state for other users' typing status
        if (typing.username !== username) {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            if (typing.isTyping) {
              next.add(typing.username);
            } else {
              next.delete(typing.username);
            }
            return next;
          });
        }
      }
      // Handle read receipt notifications
      if (event === "chat.read") {
        const receipt = data as { messageId: string; readBy: string; timestamp: number };
        // Only track receipts from other users
        if (receipt.readBy !== username) {
          setReadReceipts((prev) => {
            const next = new Map(prev);
            const existing = next.get(receipt.messageId) || [];
            // Prevent duplicate receipts from same user
            if (!existing.some((r) => r.readBy === receipt.readBy)) {
              next.set(receipt.messageId, [...existing, { readBy: receipt.readBy, timestamp: receipt.timestamp }]);
            }
            return next;
          });
        }
      }
    },
  });

  /**
   * Sends read receipts for all existing messages on mount.
   * Ensures proper read status when joining an ongoing conversation.
   */
  useEffect(() => {
    if (messages?.messages) {
      messages.messages.forEach((msg) => {
        if (msg.sender !== username) sendReadReceipt(msg.id);
      });
    }
  }, [messages?.messages, username, sendReadReceipt]);

  /**
   * Mutation to terminate the room immediately.
   * Triggers chat.destroy event for all connected users.
   */
  const { mutate: destroyRoom } = useMutation({
    mutationFn: () => client.room.delete(null, { query: { roomId } }),
  });

  /**
   * Copies the room URL to clipboard for sharing.
   * Shows brief "COPIED!" feedback on the button.
   */
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyStatus("COPIED!");
    setTimeout(() => setCopyStatus("COPY"), 2000);
  };

  // ==================== Render ====================
  return (
    <main className="flex flex-col h-screen-safe max-h-screen-safe overflow-hidden bg-grid relative">
      {/* Ambient glow effect at top of page */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-50 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* ==================== Header Section ==================== */}
      <header className="theme-border-secondary border-b p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 theme-bg-elevated backdrop-blur-sm relative z-10">
        {/* Room info and copy link */}
        <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] theme-text-muted uppercase tracking-wider">Session</span>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Truncated room ID display */}
              <span className="font-mono text-xs sm:text-sm truncate theme-text max-w-20 sm:max-w-none">{roomId.slice(0, 12)}</span>
              <button
                onClick={copyLink}
                className="text-[9px] theme-bg-secondary hover:opacity-80 px-2 py-0.5 theme-text-muted hover:theme-text transition-colors tracking-wider theme-border border shrink-0"
              >
                {copyStatus}
              </button>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="h-8 w-px theme-border-secondary border-l shrink-0" />

          {/* Countdown timer display */}
          <div className="flex flex-col shrink-0">
            <span className="text-[10px] theme-text-muted uppercase tracking-wider">Countdown</span>
            <span className="text-xs sm:text-sm font-bold font-mono mt-0.5 text-orange-500">
              {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleTheme}
            className="text-[10px] theme-bg-secondary hover:opacity-80 p-2 sm:px-3 sm:py-2 theme-text transition-all flex items-center justify-center theme-border border"
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
            className="text-[10px] theme-bg-secondary hover-red px-2 sm:px-4 py-2 theme-text font-bold transition-all group flex items-center gap-1 sm:gap-2 disabled:opacity-50 tracking-wider theme-border border"
          >
            <span className="group-hover:animate-pulse">◈</span>
            <span className="hidden min-[400px]:inline">TERMINATE</span>
            <span className="min-[400px]:hidden">END</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 relative z-10">
        {messages?.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 theme-border border flex items-center justify-center">
              <span className="theme-text-faint text-lg">◇</span>
            </div>
            <p className="theme-text-faint text-xs tracking-wider uppercase">No messages yet</p>
          </div>
        )}

        {messages?.messages.map((msg) => (
          <div key={msg.id} className="flex flex-col items-start group">
            <div className="max-w-[80%]">
              <div className="flex items-baseline gap-3 mb-1.5">
                <span className={`text-[10px] font-bold tracking-wider ${msg.sender === username ? "text-orange-500" : "theme-text-secondary"}`}>
                  {msg.sender === username ? "YOU" : "THEM"}
                </span>
                <span className="text-[10px] theme-text-faint font-mono">{format(msg.timestamp, "HH:mm:ss")}</span>
                <button
                  onClick={() => copyMessage(msg.id, msg.text)}
                  className="text-[9px] theme-text-faint hover:theme-text opacity-0 group-hover:opacity-100 transition-opacity tracking-wider"
                  title="Copy message"
                >
                  {copiedMessageId === msg.id ? "COPIED!" : "COPY"}
                </button>
              </div>

              <div className={`text-sm theme-text-secondary leading-relaxed break-all pl-3 border-l-2 ${msg.sender === username ? "border-orange-600/40" : "theme-border-secondary"}`}>
                {msg.text}
              </div>

              {msg.sender === username && (
                <div className="flex items-center gap-1 mt-1 pl-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={readReceipts.get(msg.id)?.length ? "text-orange-500" : "theme-text-faint"}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className={`text-[9px] tracking-wider ${readReceipts.get(msg.id)?.length ? "text-orange-500/70" : "theme-text-faint"}`}>
                    {readReceipts.get(msg.id)?.length ? "READ" : "SENT"}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 pl-3 animate-pulse">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[10px] theme-text-muted tracking-wider">THEY are typing...</span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 theme-border-secondary border-t theme-bg-elevated backdrop-blur-sm relative z-10">
        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 relative group min-w-0">
            <span className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-orange-500 text-xs font-mono ${!isInputFocused ? "animate-pulse" : ""}`}>
              ◈
            </span>
            <input
              autoFocus
              ref={inputRef}
              type="text"
              value={input}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  sendMessage({ text: input });
                  inputRef.current?.focus();
                }
              }}
              placeholder="Enter message..."
              onChange={(e) => {
                setInput(e.target.value);
                if (e.target.value.trim()) handleTyping();
              }}
              className="w-full theme-bg-input theme-border border focus:border-orange-600/50 focus:outline-none transition-colors theme-text placeholder:theme-text-faint py-2.5 sm:py-3 pl-8 sm:pl-10 pr-3 sm:pr-4 text-sm"
            />
          </div>

          <button
            onClick={() => {
              sendMessage({ text: input });
              inputRef.current?.focus();
            }}
            disabled={!input.trim() || isPending}
            className="bg-linear-to-r from-orange-500 to-orange-600 px-4 sm:px-6 text-xs font-bold tracking-wider hover:from-orange-400 hover:to-orange-500 hover-orange-glow transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 text-white"
          >
            SEND
          </button>
        </div>
      </div>
    </main>
  );
}

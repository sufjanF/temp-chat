"use client";

import { Suspense, useState, useEffect } from "react";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

import { useTheme } from "@/hooks/use-theme";
import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";

function Page() {
  return (
    <Suspense>
      <Lobby />
    </Suspense>
  );
}

export default Page;

// Loading overlay component with impressive animations
function RoomCreationLoader() {
  const [statusText, setStatusText] = useState("INITIALIZING SECURE ROOM");
  const [dots, setDots] = useState("");

  useEffect(() => {
    // Animated dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);

    // Cycling status messages
    const messages = [
      "INITIALIZING SECURE ROOM",
      "GENERATING ENCRYPTION KEYS",
      "ESTABLISHING CONNECTION",
      "PREPARING EPHEMERAL ROOM",
    ];
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setStatusText(messages[messageIndex]);
    }, 2000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)]/95 backdrop-blur-md">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-500/30 rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Central loader */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Animated rings */}
        <div className="relative w-32 h-32">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 rounded-full border-2 border-orange-500/20 animate-spin-slow" />
          
          {/* Middle pulsing ring */}
          <div className="absolute inset-2 rounded-full border border-orange-500/40 animate-pulse-ring" />
          
          {/* Inner spinning ring (reverse) */}
          <div className="absolute inset-4 rounded-full border-2 border-transparent border-t-orange-500 border-r-orange-500/50 animate-spin-reverse" />
          
          {/* Core glow */}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 animate-pulse-glow" />
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <svg
                className="w-8 h-8 text-orange-500 animate-pulse"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              {/* Icon glow */}
              <div className="absolute inset-0 blur-md bg-orange-500/30 animate-pulse" />
            </div>
          </div>

          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-spin-slow">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(234,88,12,0.8)]" />
          </div>
          <div className="absolute inset-0 animate-spin-reverse" style={{ animationDuration: "4s" }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-400 rounded-full shadow-[0_0_8px_rgba(234,88,12,0.6)]" />
          </div>
        </div>

        {/* Status text */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-1">
            <span className="text-orange-500 font-mono text-sm tracking-wider">
              {statusText}
            </span>
            <span className="text-orange-500 font-mono text-sm w-4 text-left">{dots}</span>
          </div>
          
          {/* Progress bar */}
          <div className="w-64 h-0.5 bg-[var(--border-primary)] rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 animate-progress-indeterminate" />
          </div>
          
          <p className="text-[var(--text-faint)] text-[10px] tracking-widest uppercase">
            End-to-end encrypted
          </p>
        </div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-8 left-8 w-8 h-8 border-l-2 border-t-2 border-orange-500/30 animate-pulse" />
      <div className="absolute top-8 right-8 w-8 h-8 border-r-2 border-t-2 border-orange-500/30 animate-pulse" style={{ animationDelay: "0.5s" }} />
      <div className="absolute bottom-8 left-8 w-8 h-8 border-l-2 border-b-2 border-orange-500/30 animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-8 right-8 w-8 h-8 border-r-2 border-b-2 border-orange-500/30 animate-pulse" style={{ animationDelay: "1.5s" }} />
    </div>
  );
}

// Duration options in minutes
const DURATION_OPTIONS = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
] as const;

function Lobby() {
  const { username } = useUsername();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(10);
  const [previewTime, setPreviewTime] = useState<number>(10 * 60); // seconds

  const searchParams = useSearchParams();
  const wasDestroyed = searchParams.get("destroyed") === "true";
  const error = searchParams.get("error");

  // Live countdown timer preview
  useEffect(() => {
    setPreviewTime(selectedDuration * 60);
  }, [selectedDuration]);

  useEffect(() => {
    if (previewTime <= 0) {
      setPreviewTime(selectedDuration * 60);
      return;
    }

    const interval = setInterval(() => {
      setPreviewTime((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [previewTime, selectedDuration]);

  const formatPreviewTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const { mutate: createRoom } = useMutation({
    mutationFn: async () => {
      setIsCreating(true);
      // Small delay to show the animation
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const res = await client.room.create.post({ duration: selectedDuration });

      if (res.status === 200) {
        router.push(`/room/${res.data?.roomId}`);
      } else {
        setIsCreating(false);
      }
    },
    onError: () => {
      setIsCreating(false);
    },
  });

  return (
    <main className="flex min-h-screen-safe flex-col items-center justify-center p-4 bg-grid relative overflow-auto">
      {/* Loading overlay */}
      {isCreating && <RoomCreationLoader />}
      
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 theme-bg-secondary hover:bg-orange-500/10 p-2.5 theme-text transition-all flex items-center justify-center theme-border border z-20 group"
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        {theme === "dark" ? (
          <svg className="w-4 h-4 group-hover:text-orange-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 group-hover:text-orange-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* Central ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/[0.03] rounded-full blur-3xl pointer-events-none" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-500/20 rounded-full animate-float-particle"
            style={{
              left: `${10 + (i * 6) % 80}%`,
              top: `${15 + (i * 7) % 70}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${4 + (i % 3)}s`,
            }}
          />
        ))}
      </div>
      
      {/* Scanning line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent animate-scan-line" />
      </div>
      
      {/* Decorative corner elements */}
      <div className="absolute top-6 left-6 w-16 h-16 border-l border-t border-orange-500/20 pointer-events-none" />
      <div className="absolute top-6 right-6 w-16 h-16 border-r border-t border-orange-500/20 pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-16 h-16 border-l border-b border-orange-500/20 pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-16 h-16 border-r border-b border-orange-500/20 pointer-events-none" />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 pointer-events-none bg-radial-vignette" />
      
      {/* Noise/grain overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-noise" />
      
      {/* CRT scanlines */}
      <div className="absolute inset-0 pointer-events-none bg-scanlines opacity-[0.03]" />
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Status notifications */}
        {wasDestroyed && (
          <div className="theme-bg-elevated border border-orange-500/30 p-4 text-center backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-orange-500/10 to-orange-500/5" />
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <p className="text-orange-500 text-xs font-bold tracking-widest">ROOM DESTROYED</p>
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              </div>
              <p className="theme-text-muted text-xs">
                All messages were permanently deleted
              </p>
            </div>
          </div>
        )}
        {error === "room-not-found" && (
          <div className="theme-bg-elevated border border-orange-500/30 p-4 text-center backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-orange-500/10 to-orange-500/5" />
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
                <p className="text-orange-500 text-xs font-bold tracking-widest">ROOM NOT FOUND</p>
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
              </div>
              <p className="theme-text-muted text-xs">
                This room may have expired or never existed
              </p>
            </div>
          </div>
        )}
        {error === "room-full" && (
          <div className="theme-bg-elevated border border-orange-500/30 p-4 text-center backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-orange-500/10 to-orange-500/5" />
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
                <p className="text-orange-500 text-xs font-bold tracking-widest">ROOM FULL</p>
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
              </div>
              <p className="theme-text-muted text-xs">
                This room is at maximum capacity
              </p>
            </div>
          </div>
        )}

        {/* Hero section */}
        <div className="text-center space-y-5">
          {/* Animated logo container */}
          <div className="relative inline-block group">
            {/* Multiple glow layers */}
            <div className="absolute -inset-8 bg-orange-500/10 blur-2xl rounded-full animate-pulse-glow" />
            <div className="absolute -inset-4 bg-orange-500/5 blur-xl rounded-full animate-breathe" />
            
            {/* Main logo with dissolve effect */}
            <h1 className="relative text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight theme-text logo-dissolve">
              temp<span className="text-orange-500 animate-flicker">_</span>chat
            </h1>
          </div>
          
          {/* Tagline with decorative elements */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500/50" />
            <p className="theme-text-muted text-sm tracking-wide">Messages vanish. Privacy remains.</p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/50" />
          </div>
          
          {/* Feature badges */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] theme-bg-secondary theme-border border theme-text-muted tracking-wider">
              <svg className="w-3 h-3 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              ENCRYPTED
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] theme-bg-secondary theme-border border theme-text-muted tracking-wider">
              <svg className="w-3 h-3 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              2 USERS
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] theme-bg-secondary theme-border border theme-text-muted tracking-wider">
              <svg className="w-3 h-3 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l18 18M10.5 10.5a3 3 0 0 0 4.24 4.24M9 9a5 5 0 0 1 7.5 1.5M14.5 14.5A5 5 0 0 1 9 9M4.93 4.93A10 10 0 0 0 3 12c0 5.52 4.48 10 10 10 2.76 0 5.26-1.12 7.07-2.93M21 12c0-5.52-4.48-10-10-10-.87 0-1.72.11-2.53.32" />
              </svg>
              NO LOGS
            </span>
          </div>
        </div>

        {/* Main card */}
        <div className="theme-border border theme-bg-elevated backdrop-blur-md relative overflow-hidden animate-border-pulse">
          {/* Card glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-600/5 pointer-events-none" />
          
          {/* Top accent line */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
          
          <div className="p-6 space-y-5 relative">
            {/* Timer selection */}
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="flex items-center theme-text-secondary text-xs tracking-wider uppercase">
                  <svg className="w-3.5 h-3.5 mr-2 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Self-Destruct Timer
                </span>
                <span className="text-orange-500 text-xs font-mono font-bold tabular-nums">
                  {formatPreviewTime(previewTime)}
                </span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedDuration(option.value)}
                    className={`relative p-2.5 text-xs font-mono transition-all border overflow-hidden group ${
                      selectedDuration === option.value
                        ? "bg-orange-500/20 border-orange-500 text-orange-500"
                        : "theme-bg-input theme-border theme-text-secondary hover:border-orange-500/50 hover:text-orange-500/80"
                    }`}
                  >
                    {selectedDuration === option.value && (
                      <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent" />
                    )}
                    <span className="relative">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => createRoom()}
              className="w-full relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3.5 text-sm font-bold transition-all cursor-pointer disabled:opacity-50 tracking-wider group"
            >
              {/* Button shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {/* Button glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-orange-600/50 to-transparent" />
              <span className="relative flex items-center justify-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                INITIALIZE ROOM
              </span>
            </button>
            
            {/* Info text */}
            <p className="theme-text-faint text-[10px] text-center tracking-wide">
              Room self-destructs after {selectedDuration === 60 ? "1 hour" : `${selectedDuration} minutes`}
            </p>
          </div>
          
          {/* Bottom accent line */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
        </div>
      </div>
    </main>
  );
}

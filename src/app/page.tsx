"use client";

import { Suspense, useEffect, useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

import { useTheme } from "@/hooks/use-theme";
import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";

const DURATION_OPTIONS = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
] as const;

// Pre-computed particle positions for deterministic rendering

const LOBBY_PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  left: `${10 + (i * 6) % 80}%`,
  top: `${15 + (i * 7) % 70}%`,
  delay: `${i * 0.4}s`,
  duration: `${4 + (i % 3)}s`,
}));

export default function Page() {
  return (
    <Suspense>
      <Lobby />
    </Suspense>
  );
}

function RoomCreationLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--bg-primary)/95 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4">
        <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <span className="text-orange-500 font-mono text-sm tracking-wider">Initializing secure room</span>
      </div>
    </div>
  );
}

function Lobby() {
  useUsername();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const searchParams = useSearchParams();
  
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [previewTime, setPreviewTime] = useState(10 * 60);

  const wasDestroyed = searchParams.get("destroyed") === "true";
  const error = searchParams.get("error");

  useEffect(() => {
    setPreviewTime(selectedDuration * 60);
  }, [selectedDuration]);

  useEffect(() => {
    if (previewTime <= 0) {
      setPreviewTime(selectedDuration * 60);
      return;
    }
    const interval = setInterval(() => setPreviewTime((prev) => prev - 1), 1000);
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
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const res = await client.room.create.post({ duration: selectedDuration });
      if (res.status === 200) {
        router.push(`/room/${res.data?.roomId}`);
      } else {
        setIsCreating(false);
      }
    },
    onError: () => setIsCreating(false),
  });

  return (
    <main className="flex min-h-screen-safe flex-col items-center justify-center p-4 bg-grid relative overflow-auto">
      {isCreating && <RoomCreationLoader />}
      
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

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-orange-600/3 rounded-full blur-3xl pointer-events-none" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {LOBBY_PARTICLES.map((particle, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-500/20 rounded-full animate-float-particle"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>
      
      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-full h-px bg-linear-to-r from-transparent via-orange-500/20 to-transparent animate-scan-line" />
      </div>
      
      {/* Corner elements */}
      <div className="absolute top-6 left-6 w-16 h-16 border-l border-t border-orange-500/20 pointer-events-none" />
      <div className="absolute top-6 right-6 w-16 h-16 border-r border-t border-orange-500/20 pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-16 h-16 border-l border-b border-orange-500/20 pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-16 h-16 border-r border-b border-orange-500/20 pointer-events-none" />
      
      {/* Visual overlays */}
      <div className="absolute inset-0 pointer-events-none bg-radial-vignette" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-noise" />
      <div className="absolute inset-0 pointer-events-none bg-scanlines opacity-[0.03]" />
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Status notifications */}
        {wasDestroyed && (
          <div className="theme-bg-elevated border border-orange-500/30 p-4 text-center backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-r from-orange-500/5 via-orange-500/10 to-orange-500/5" />
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <p className="text-orange-500 text-xs font-bold tracking-widest">ROOM DESTROYED</p>
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              </div>
              <p className="theme-text-muted text-xs">All messages were permanently deleted</p>
            </div>
          </div>
        )}
        
        {error === "room-not-found" && (
          <div className="theme-bg-elevated border border-orange-500/30 p-4 text-center backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-r from-orange-500/5 via-orange-500/10 to-orange-500/5" />
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
                <p className="text-orange-500 text-xs font-bold tracking-widest">ROOM NOT FOUND</p>
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
              </div>
              <p className="theme-text-muted text-xs">This room may have expired or never existed</p>
            </div>
          </div>
        )}
        
        {error === "room-full" && (
          <div className="theme-bg-elevated border border-orange-500/30 p-4 text-center backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-r from-orange-500/5 via-orange-500/10 to-orange-500/5" />
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
                <p className="text-orange-500 text-xs font-bold tracking-widest">ROOM FULL</p>
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
              </div>
              <p className="theme-text-muted text-xs">This room is at maximum capacity</p>
            </div>
          </div>
        )}

        {/* Hero section */}
        <div className="text-center space-y-5">
          <div className="relative inline-block group">
            <div className="absolute -inset-8 bg-orange-500/10 blur-2xl rounded-full animate-pulse-glow" />
            <div className="absolute -inset-4 bg-orange-500/5 blur-xl rounded-full animate-breathe" />
            <h1 className="relative text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight theme-text logo-dissolve">
              temp<span className="text-orange-500 animate-flicker">_</span>chat
            </h1>
          </div>
          
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-linear-to-r from-transparent to-orange-500/50" />
            <p className="theme-text-muted text-sm tracking-wide">Messages vanish. Privacy remains.</p>
            <div className="h-px w-8 bg-linear-to-l from-transparent to-orange-500/50" />
          </div>
          
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] theme-bg-secondary theme-border border theme-text-muted tracking-wider">
              <svg className="w-3 h-3 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              SECURE
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
          <div className="absolute inset-0 bg-linear-to-br from-orange-500/5 via-transparent to-orange-600/5 pointer-events-none" />
          <div className="h-0.5 bg-linear-to-r from-transparent via-orange-500 to-transparent" />
          
          <div className="p-6 space-y-5 relative">
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
                      <div className="absolute inset-0 bg-linear-to-t from-orange-500/10 to-transparent" />
                    )}
                    <span className="relative">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => createRoom()}
              className="w-full relative overflow-hidden bg-linear-to-r from-orange-500 to-orange-600 text-white p-3.5 text-sm font-bold transition-all cursor-pointer disabled:opacity-50 tracking-wider group"
            >
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-linear-to-t from-orange-600/50 to-transparent" />
              <span className="relative flex items-center justify-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                INITIALIZE ROOM
              </span>
            </button>
            
            <p className="theme-text-faint text-[10px] text-center tracking-wide">
              Room self-destructs after {selectedDuration === 60 ? "1 hour" : `${selectedDuration} minutes`}
            </p>
          </div>
          
          <div className="h-0.5 bg-linear-to-r from-transparent via-orange-500/50 to-transparent" />
        </div>
      </div>
    </main>
  );
}

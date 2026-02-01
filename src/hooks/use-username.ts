import { useSyncExternalStore } from "react";

import { nanoid } from "nanoid";

const ANIMALS = ["wolf", "hawk", "bear", "shark"];
const STORAGE_KEY = "chat_username";

function generateUsername(): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `anonymous-${animal}-${nanoid(5)}`;
}

function getStoredUsername(): string {
  if (typeof window === "undefined") return "";
  let username = localStorage.getItem(STORAGE_KEY);
  if (!username) {
    username = generateUsername();
    localStorage.setItem(STORAGE_KEY, username);
  }
  return username;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useUsername() {
  const username = useSyncExternalStore(subscribe, getStoredUsername, () => "");
  return { username };
}

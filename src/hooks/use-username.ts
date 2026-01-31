import { useEffect, useState } from "react";

import { nanoid } from "nanoid";

const ANIMALS = ["wolf", "hawk", "bear", "shark"];
const STORAGE_KEY = "chat_username";

function generateUsername(): string {
  const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `anonymous-${word}-${nanoid(5)}`;
}

export function useUsername() {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      setUsername(stored);
      return;
    }

    const generated = generateUsername();
    localStorage.setItem(STORAGE_KEY, generated);
    setUsername(generated);
  }, []);

  return { username };
}

import { treaty } from "@elysiajs/eden";

import type { App } from "@/app/api/[[...slugs]]/route";

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

export const client = treaty<App>(getBaseUrl()).api;
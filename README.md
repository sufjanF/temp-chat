# temp_chat

Secure, private, two‑user chat rooms with real‑time messaging that vanish when the 10 minute timer ends.

## Features

- **Ephemeral Rooms**: Chat rooms automatically expire after 10 minutes with a live countdown timer
- **Real-time Messaging**: Instant message delivery via WebSocket connections
- **Shareable Room Links**: Create a room and invite someone via a unique URL
- **Anonymous Users**: Auto-generated usernames (e.g., `anonymous-fox-x7k2`)
- **Manual Termination**: End a session instantly with the terminate control
- **Dark/Light Mode**: Toggle between themes with persistent preference
- **Zero Persistence**: Messages vanish when the room expires

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Runtime | [React 19](https://react.dev) |
| Language | [TypeScript](https://typescriptlang.org) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Real-time | [Upstash Realtime](https://upstash.com/docs/redis/realtime/overview) |
| Database | [Redis](https://upstash.com/redis) |
| Data Fetching | [TanStack Query](https://tanstack.com/query) |
| Package Manager | [Bun](https://bun.sh) |

## Setup

### Environment Variables

Create a `.env.local` file:

```env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production

```bash
bun run build
bun run start
```

## Project Structure

```
.
├── public/
├── src/
│   ├── app/
│   │   ├── globals.css                # Global styles + theme variables
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Landing page
│   │   ├── room/
│   │   │   └── [roomId]/page.tsx      # Chat room page
│   │   └── api/
│   │       ├── realtime/route.ts      # Realtime auth endpoint
│   │       └── [[...slugs]]/
│   │           ├── auth.ts            # Auth helpers
│   │           └── route.ts           # API handler
│   ├── components/
│   │   └── providers.tsx              # App providers
│   ├── hooks/
│   │   ├── use-theme.tsx              # Theme toggle hook
│   │   └── use-username.ts            # Username generation
│   ├── lib/
│   │   ├── client.ts                  # API client
│   │   ├── realtime-client.ts         # Realtime client
│   │   ├── realtime.ts                # Realtime configuration
│   │   └── redis.ts                   # Redis client
│   └── proxy.ts                       # API proxy utilities
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## License

MIT

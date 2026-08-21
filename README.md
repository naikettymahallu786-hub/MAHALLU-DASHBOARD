# Mahallu ERP — Dashboard

Next.js 16 + React 19 admin dashboard for the Mahallu ERP system.

Extracted from the `MAHALLU` monorepo (`apps/dashboard`) with full commit history preserved for
this app's files. The single symbol it previously imported from the shared workspace package
(`AuthTokens`) has been inlined at `src/types/auth.ts`; the vendored `packages/` directory was
removed.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in API URL etc.
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm start` — run the production build
- `npm run lint` — Next.js ESLint
- `npm run type-check` — `tsc --noEmit`

## Environment variables

See `.env.example`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_APP_NAME`.
Points at the `mahallu-backend` API.

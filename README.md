# BSE Trades: Long-Running Pull Dashboard (MERN)

Mock BSE API (15-minute pull) + React dashboard that opens instantly and updates live when a pull completes, under a 30-second connection limit.
See [ARCHITECTURE.md](./ARCHITECTURE.md) for the diagram and design rationale.

## Stack
MongoDB · Express · React (Vite) · Node 20.6+ · Server-Sent Events

## Structure
```
mock-bse/   Mock BSE API   (GET /getTrades, seeded data, configurable delay) :4000
backend/    Express API    (REST, webhook receiver, SSE, MongoDB)            :4001
frontend/   React dashboard                                                  :5173
```

## Setup
Prerequisites: Node.js >= 20.6, Docker (or a local MongoDB).

```bash
docker compose up -d          # MongoDB on :27017
npm run install:all           # installs root + all three packages
npm run dev                   # starts mock-bse, backend and frontend
```
Open http://localhost:5173.

`.env` files are pre-created from the `.env.example` files.

### Quick demo (don't wait 15 min)
Set `PULL_DELAY_MS=20000` in `mock-bse/.env` and restart. Default is `900000` (15 min).

## Try it
1. Open the dashboard. It loads instantly, empty on the very first run, with "Pull in progress".
2. After the delay, trades appear on their own and a notice shows the new count.
3. Click **Start new pull** to run another one. It returns slightly more trades each time. Open two tabs to see both update.
4. Refresh mid-pull: previously stored trades still show instantly.

## API
| Service | Endpoint | Description |
|---|---|---|
| mock-bse | `GET /getTrades?callbackUrl=<url>[&delayMs=]` | `202 {jobId}` now; POSTs trades to `callbackUrl` after the delay |
| backend | `GET /api/trades?page&limit&search` | Stored trades (paginated) |
| backend | `POST /api/pulls` | Start a pull (`409` if one is running) |
| backend | `GET /api/pulls/latest` | Latest pull status |
| backend | `GET /api/events` | SSE stream (`pull:started`, `pull:completed`, `pull:failed`) |
| backend | `POST /webhooks/bse` | Callback from BSE (secret-protected, idempotent) |

## Config
`mock-bse/.env`: `PORT`, `PULL_DELAY_MS`, `TRADE_COUNT`, `WEBHOOK_SECRET`
`backend/.env`: `PORT`, `MONGO_URI`, `BSE_URL`, `PUBLIC_URL`, `WEBHOOK_SECRET`, `AUTO_START_PULL`, `PULL_TIMEOUT_MS`, `SSE_MAX_AGE_MS`

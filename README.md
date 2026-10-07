# BSE Trades: Long-Running Pull Dashboard (MERN)

Mock BSE API (15-minute pull) + React dashboard that opens instantly and updates live when a pull completes, under a 30-second connection limit.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the diagram and design rationale.

## Stack

MongoDB Atlas · Express · React (Vite) · Node 20.6+ · Server-Sent Events

## Structure

```text
mock-bse/   Mock BSE API   (GET /getTrades, seeded data, configurable delay) :4000

backend/    Express API   (REST, webhook receiver, SSE, MongoDB Atlas)      :4001

frontend/   React dashboard                                                  :5173
```

## Setup

### Prerequisites

* Node.js >= 20.6
* MongoDB Atlas account and cluster

### 1. Configure MongoDB Atlas

Create a MongoDB Atlas cluster and create a database user.

Add your MongoDB Atlas connection string to:

```text
backend/.env
```

Example:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/bse-trades
```

Replace `<username>`, `<password>`, and `<cluster-url>` with your MongoDB Atlas credentials.

Make sure your IP address is allowed in the MongoDB Atlas Network Access settings.

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Start the application

```bash
npm run dev
```

This starts the Mock BSE API, backend, and frontend.

Open:

http://localhost:5173

The application uses MongoDB Atlas for persistent trade and pull-state storage. No local MongoDB installation or Docker is required.

`.env` files should be configured using the corresponding `.env.example` files.

## Quick Demo (don't wait 15 min)

For development and demonstration, set:

```env
PULL_DELAY_MS=20000
```

in:

```text
mock-bse/.env
```

This makes the mock BSE pull complete after 20 seconds.

The default configuration is:

```env
PULL_DELAY_MS=900000
```

which represents the real-world 15-minute pull.

## Try it

1. Open the dashboard. It loads instantly, empty on the very first run, with "Pull in progress".
2. After the configured delay, trades appear automatically and a notice shows the new count.
3. Click **Start new pull** to run another one. It returns slightly more trades each time.
4. Open two tabs to see both dashboards update automatically.
5. Refresh the page while a pull is in progress. Previously stored trades still appear instantly.

## API

| Service  | Endpoint                                      | Description                                                                                    |
| -------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| mock-bse | `GET /getTrades?callbackUrl=<url>[&delayMs=]` | Returns `202 {jobId}` immediately and POSTs trades to `callbackUrl` after the configured delay |
| backend  | `GET /api/trades?page&limit&search`           | Returns stored trades (paginated)                                                              |
| backend  | `POST /api/pulls`                             | Starts a pull (`409` if one is already running)                                                |
| backend  | `GET /api/pulls/latest`                       | Returns the latest pull status                                                                 |
| backend  | `GET /api/events`                             | SSE stream (`pull:started`, `pull:completed`, `pull:failed`)                                   |
| backend  | `POST /webhooks/bse`                          | Callback from the Mock BSE API (secret-protected and idempotent)                               |

## Configuration

### `mock-bse/.env`

```env
PORT=
PULL_DELAY_MS=
TRADE_COUNT=
WEBHOOK_SECRET=
```

### `backend/.env`

```env
PORT=
MONGO_URI=
BSE_URL=
PUBLIC_URL=
WEBHOOK_SECRET=
AUTO_START_PULL=
PULL_TIMEOUT_MS=
SSE_MAX_AGE_MS=
```

## Architecture

The application uses an asynchronous pull architecture:

```text
React Dashboard
       │
       ├── REST ──────────────► Express API
       │                            │
       │                            ├── MongoDB Atlas
       │                            │
       │                            └── Mock BSE API
       │                                  │
       │                                  └── Webhook
       │                                         │
       ◄──────────── SSE ────────────────────────┘
```

The Mock BSE API acknowledges a pull immediately with a `202` response instead of keeping an HTTP connection open for the full 15-minute delay. Once the pull completes, the Mock BSE API sends the trade data to the backend through a webhook.

The backend persists the trades in MongoDB Atlas and pushes a completion event to connected dashboards through Server-Sent Events (SSE).

This keeps long-running work outside the request/response connection and allows the dashboard to update without page refreshes, polling, cron jobs, or schedulers.

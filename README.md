# BSE Trades: Long-Running Pull Dashboard (MERN)

A mock BSE API (15-minute pull) plus a React dashboard that opens instantly and updates live when a pull completes, all under a 30-second connection limit.

- **Architecture note:** [ARCHITECTURE.md](./ARCHITECTURE.md) (diagram and design rationale)
- **Video walkthrough:** <ADD-YOUR-VIDEO-LINK-HERE>

## How it works (short version)

The Mock BSE API replies `202 Accepted` immediately and calls the backend back through a **webhook** when the pull finishes. The backend stores the trades in MongoDB Atlas and pushes a **Server-Sent Event** to every open dashboard, which then re-renders. No request ever waits for the 15-minute pull, and there is no polling, cron job, or scheduler.

## Stack

MongoDB Atlas · Express · React (Vite) · Node 20.6+ · Server-Sent Events

## Structure

```text
mock-bse/   Mock BSE API   (GET /getTrades, seeded data, configurable delay)   :4000
backend/    Express API    (REST, webhook receiver, SSE, MongoDB Atlas)        :4001
frontend/   React dashboard                                                    :5173
```

## Setup

### Prerequisites

* Node.js >= 20.6
* A MongoDB Atlas account and cluster (free tier is enough). No Docker or local MongoDB installation is needed.

### 1. Configure MongoDB Atlas

1. Create a cluster and a database user in MongoDB Atlas.
2. In **Network Access**, allow your IP address. For a quick evaluation, `0.0.0.0/0` also works.
3. Copy the connection string into `backend/.env`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/bse-trades
```

Replace `<username>`, `<password>`, and `<cluster-url>` with your own values. A local `mongod` URI also works in `MONGO_URI` if you prefer.

### 2. Create the `.env` files

Copy each example file and fill in the values:

```bash
cp backend/.env.example backend/.env
cp mock-bse/.env.example mock-bse/.env
```

> `.env` files hold secrets and are git-ignored. Never commit them.

Make sure `WEBHOOK_SECRET` has the **same value** in `backend/.env` and `mock-bse/.env`.

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Start everything

```bash
npm run dev
```

This starts the Mock BSE API, the backend, and the frontend. Open <http://localhost:5173>.

## Quick Demo (don't wait 15 minutes)

In `mock-bse/.env`, set:

```env
PULL_DELAY_MS=20000
```

The mock BSE pull then completes after 20 seconds. This only changes the mock's delay, not the architecture: the connection is still closed in milliseconds and the result still arrives by webhook.

The default is `PULL_DELAY_MS=900000`, which represents the real 15-minute pull.

## Try it

1. Open the dashboard. It loads instantly, empty on the very first run, showing "Pull in progress".
2. After the configured delay, trades appear automatically and a notice shows the new count.
3. Click **Start new pull** to run another one. Each pull returns slightly more trades.
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
PORT=             # mock BSE port (4000)
PULL_DELAY_MS=    # time before the webhook fires (900000 = 15 min)
TRADE_COUNT=      # number of seeded trades
WEBHOOK_SECRET=   # must match the backend
```

### `backend/.env`

```env
PORT=             # backend port (4001)
MONGO_URI=        # MongoDB Atlas connection string
BSE_URL=          # base URL of the mock BSE API
PUBLIC_URL=       # backend URL the mock BSE can reach for its callback
WEBHOOK_SECRET=   # must match the mock BSE
AUTO_START_PULL=  # start a pull on server boot (true/false)
PULL_TIMEOUT_MS=  # a pull running longer than this is marked failed
SSE_MAX_AGE_MS=   # SSE streams are recycled after this (keep under 30000)
```

## Troubleshooting

* **Backend can't connect to MongoDB:** check your IP in Atlas Network Access and that the username and password in `MONGO_URI` are correct (URL-encode special characters).
* **Webhook returns 401:** `WEBHOOK_SECRET` differs between `backend/.env` and `mock-bse/.env`.
* **Nothing updates after a pull:** make sure `PUBLIC_URL` is reachable from the mock BSE (`http://localhost:4001` when running locally).
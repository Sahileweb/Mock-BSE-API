# Architecture Note

## Problem
A BSE pull takes up to **15 minutes**, but the network kills any HTTP connection open **> 30 s**.
So no request may wait for a pull, and the UI must show data instantly while a pull is running.

## Design: async job + webhook + store + push

```mermaid
sequenceDiagram
    participant UI as React Dashboard
    participant API as Express API
    participant DB as MongoDB
    participant BSE as Mock BSE API

    UI->>API: GET /api/trades (instant, from DB)
    API->>DB: read stored trades
    UI->>API: open SSE stream /api/events
    API->>BSE: GET /getTrades?callbackUrl=... (on boot / button)
    BSE-->>API: 202 Accepted {jobId}  (connection closed in ms)
    Note over BSE: works for ~15 min, no open connection
    BSE->>API: POST /webhooks/bse {jobId, trades}
    API->>DB: idempotent upsert by tradeId
    API-->>UI: SSE event pull:completed
    UI->>API: GET /api/trades (re-render, no page refresh)
```

```
 Browser (React) --REST--> Express API <--webhook-- Mock BSE
        ^  \--SSE (push)--/    |
        |                      v
        +------------------- MongoDB Atlas (trades, pulls)
```

## Why this design
| Requirement | How it is met |
|---|---|
| Connections < 30 s | BSE replies `202` instantly and calls back via **webhook**; nobody holds a connection for 15 min. SSE streams are recycled every 25 s and `EventSource` reconnects automatically. |
| Dashboard opens instantly | Trades are persisted in MongoDB; the dashboard reads the DB, never the BSE API directly. |
| New trades appear automatically | Webhook handler broadcasts an SSE event; the UI refetches. **Server push**, not polling. |
| No polling / cron / scheduler | Pulls are triggered by an event (server boot or the "Start new pull" button); completion arrives by webhook. No `setInterval`, no cron. |

## Reliability
- **Idempotent webhook:** unique index on `tradeId` + `$setOnInsert` upsert, replays never duplicate data. A completed `jobId` is a no-op.
- **Retries:** the mock BSE retries callback delivery with backoff (5 attempts).
- **Auth:** shared secret in `x-webhook-secret`.
- **Overlap guard:** one pull at a time (`409` otherwise); stale pulls are failed after `PULL_TIMEOUT_MS`.
- **Resync on reconnect:** the UI refetches whenever the SSE stream (re)opens, so no event is permanently lost.
- Pull state lives in MongoDB, so an API restart mid-pull still accepts the webhook afterwards.

## Trade-offs / next steps
SSE broadcast is in-memory (single API instance); scale out with Redis pub/sub. Production would add webhook HMAC signatures and queue-based ingestion.

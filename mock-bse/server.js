import express from 'express';
import { randomUUID } from 'node:crypto';
import { generateTrades } from './seed.js';

const PORT = Number(process.env.PORT ?? 4000);
const DEFAULT_DELAY_MS = Number(process.env.PULL_DELAY_MS ?? 15 * 60 * 1000);
const SECRET = process.env.WEBHOOK_SECRET ?? 'dev-secret';
const TOTAL = Number(process.env.TRADE_COUNT ?? 3000);
const ALL_TRADES = generateTrades(TOTAL);

const jobs = new Map(); 
let pullCounter = 0;

const app = express();


app.get('/getTrades', (req, res) => {
  const { callbackUrl } = req.query;
  if (!callbackUrl) return res.status(400).json({ error: 'callbackUrl query param is required' });

  const delayMs = req.query.delayMs !== undefined ? Number(req.query.delayMs) : DEFAULT_DELAY_MS;
  if (!Number.isFinite(delayMs) || delayMs < 0) return res.status(400).json({ error: 'invalid delayMs' });

  pullCounter += 1;
  const tradeCount = Math.min(TOTAL, Math.floor(TOTAL * 0.6) + pullCounter * 300);
  const jobId = randomUUID();
  const job = { jobId, status: 'PROCESSING', delayMs, tradeCount, completesAt: new Date(Date.now() + delayMs).toISOString() };
  jobs.set(jobId, job);

  setTimeout(() => deliver(job, String(callbackUrl)), delayMs);
  console.log(`[bse] job ${jobId} accepted, ${tradeCount} trades, ready in ${delayMs}ms`);
  res.status(202).json({ jobId, status: job.status, completesAt: job.completesAt });
});

app.get('/getTrades/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  return job ? res.json(job) : res.status(404).json({ error: 'unknown job' });
});

async function deliver(job, callbackUrl) {
  const body = JSON.stringify({ jobId: job.jobId, trades: ALL_TRADES.slice(0, job.tradeCount) });
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const r = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-webhook-secret': SECRET },
        body,
      });
      if (r.ok) {
        job.status = 'DELIVERED';
        console.log(`[bse] job ${job.jobId} delivered`);
        return;
      }
      throw new Error(`callback responded ${r.status}`);
    } catch (err) {
      console.warn(`[bse] delivery attempt ${attempt} failed: ${err.message}`);
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  job.status = 'FAILED';
}

app.listen(PORT, () => console.log(`Mock BSE on :${PORT} (default delay ${DEFAULT_DELAY_MS}ms)`));

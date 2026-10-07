import { Router } from 'express';
import Pull from '../models/Pull.js';
import { broadcast } from '../sse.js';

const router = Router();
const BSE_URL = process.env.BSE_URL ?? 'http://localhost:4000';
const PUBLIC_URL = process.env.PUBLIC_URL ?? 'http://localhost:4001';
const TIMEOUT = Number(process.env.PULL_TIMEOUT_MS ?? 30 * 60 * 1000);

export async function startPull() {
  await Pull.updateMany(
    { status: 'IN_PROGRESS', startedAt: { $lt: new Date(Date.now() - TIMEOUT) } },
    { status: 'FAILED', error: 'timed out waiting for BSE callback', completedAt: new Date() },
  );
  const running = await Pull.findOne({ status: 'IN_PROGRESS' });
  if (running) return { pull: running, created: false };

  const r = await fetch(`${BSE_URL}/getTrades?callbackUrl=${encodeURIComponent(`${PUBLIC_URL}/webhooks/bse`)}`);
  if (r.status !== 202) throw new Error(`BSE rejected pull (${r.status})`);
  const { jobId, completesAt } = await r.json();

  const pull = await Pull.create({ jobId, expectedAt: completesAt });
  broadcast('pull:started', pull);
  return { pull, created: true };
}

router.post('/', async (_req, res) => {
  try {
    const { pull, created } = await startPull();
    res.status(created ? 202 : 409).json(pull);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/latest', async (_req, res) => {
  res.json(await Pull.findOne().sort({ startedAt: -1 }));
});

export default router;

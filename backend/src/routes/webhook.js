import { Router } from 'express';
import Trade from '../models/Trade.js';
import Pull from '../models/Pull.js';
import { broadcast } from '../sse.js';

const router = Router();
const SECRET = process.env.WEBHOOK_SECRET ?? 'dev-secret';

router.post('/bse', async (req, res) => {
  if (req.get('x-webhook-secret') !== SECRET) return res.status(401).json({ error: 'bad secret' });

  const { jobId, trades } = req.body ?? {};
  if (!jobId || !Array.isArray(trades)) return res.status(400).json({ error: 'invalid payload' });

  const pull = await Pull.findOne({ jobId });
  if (!pull) return res.status(404).json({ error: 'unknown job' });
  if (pull.status === 'COMPLETED') return res.json({ ok: true, duplicate: true });

  try {
    const ops = trades.map((t) => ({
      updateOne: {
        filter: { tradeId: t.tradeId },
        update: { $setOnInsert: { ...t, timestamp: new Date(t.timestamp) } },
        upsert: true,
      },
    }));
    const result = ops.length ? await Trade.bulkWrite(ops, { ordered: false }) : { upsertedCount: 0 };

    pull.status = 'COMPLETED';
    pull.completedAt = new Date();
    pull.received = trades.length;
    pull.newTrades = result.upsertedCount;
    await pull.save();

    broadcast('pull:completed', pull); 
    res.json({ ok: true, newTrades: pull.newTrades });
  } catch (err) {
    pull.status = 'FAILED';
    pull.error = err.message;
    await pull.save();
    broadcast('pull:failed', pull);
    res.status(500).json({ error: err.message });
  }
});

export default router;

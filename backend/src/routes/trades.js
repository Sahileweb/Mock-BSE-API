import { Router } from 'express';
import Trade from '../models/Trade.js';

const router = Router();

router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const search = String(req.query.search ?? '').trim();

  const filter = {};
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ symbol: rx }, { client: rx }, { tradeId: rx }];
  }

  const [data, total] = await Promise.all([
    Trade.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Trade.countDocuments(filter),
  ]);
  res.json({ data, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

export default router;

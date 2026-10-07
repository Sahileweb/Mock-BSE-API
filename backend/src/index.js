import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import tradesRouter from './routes/trades.js';
import pullsRouter, { startPull } from './routes/pulls.js';
import webhookRouter from './routes/webhook.js';
import { sseHandler } from './sse.js';

const PORT = Number(process.env.PORT ?? 4001);
const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.get('/api/events', sseHandler);
app.use('/api/trades', tradesRouter);
app.use('/api/pulls', pullsRouter);
app.use('/webhooks', webhookRouter);

await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/bse_trades');
console.log('MongoDB connected');

app.listen(PORT, async () => {
  console.log(`API on :${PORT}`);
  if (process.env.AUTO_START_PULL === 'true') {
    try { await startPull(); } catch (e) { console.warn('Initial pull not started:', e.message); }
  }
});

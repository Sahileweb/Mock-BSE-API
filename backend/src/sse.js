const clients = new Set();
const MAX_AGE = Number(process.env.SSE_MAX_AGE_MS ?? 25000);

export function sseHandler(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 1000\n\n');
  clients.add(res);

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 10000);
  const recycle = setTimeout(() => res.end(), MAX_AGE);
  req.on('close', () => {
    clearInterval(heartbeat);
    clearTimeout(recycle);
    clients.delete(res);
  });
}

export function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}

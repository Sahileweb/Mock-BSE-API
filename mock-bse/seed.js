const SYMBOLS = [
  ['RELIANCE', 2900], ['TCS', 3900], ['INFY', 1500], ['HDFCBANK', 1650],
  ['ICICIBANK', 1100], ['SBIN', 780], ['ITC', 430], ['LT', 3500],
  ['WIPRO', 480], ['AXISBANK', 1150], ['MARUTI', 12000], ['TATAMOTORS', 950],
];
const CLIENTS = ['Alpha Capital', 'Birla Securities', 'Crest Wealth', 'Dalal & Co', 'Everest Funds',
  'Fortune Traders', 'Gupta Holdings', 'Horizon AMC', 'Indus Brokers', 'Jupiter Invest'];

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTrades(count = 3000, seed = 42) {
  const rand = mulberry32(seed);
  const start = Date.UTC(2026, 0, 5, 3, 45); 
  return Array.from({ length: count }, (_, i) => {
    const [symbol, base] = SYMBOLS[Math.floor(rand() * SYMBOLS.length)];
    return {
      tradeId: `T${String(i + 1).padStart(6, '0')}`,
      client: CLIENTS[Math.floor(rand() * CLIENTS.length)],
      symbol,
      quantity: (Math.floor(rand() * 50) + 1) * 10,
      price: Number((base * (0.97 + rand() * 0.06)).toFixed(2)),
      timestamp: new Date(start + i * 7000).toISOString(),
    };
  });
}

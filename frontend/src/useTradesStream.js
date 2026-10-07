import { useCallback, useEffect, useRef, useState } from 'react';

const getJson = (url, opts) => fetch(url, opts).then((r) => r.json());


export function useTradesStream({ page, search, limit = 50 }) {
  const [trades, setTrades] = useState({ data: [], total: 0, pages: 1 });
  const [pull, setPull] = useState(null);
  const [live, setLive] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const query = useRef({ page, search });
  query.current = { page, search };

  const loadTrades = useCallback(async () => {
    const { page, search } = query.current;
    const params = new URLSearchParams({ page, limit, search });
    setTrades(await getJson(`/api/trades?${params}`));
    setLoading(false);
  }, [limit]);

  useEffect(() => { loadTrades(); }, [page, search, loadTrades]);

  useEffect(() => {
    const es = new EventSource('/api/events');
    es.onopen = () => {
      setLive(true);
      loadTrades();
      getJson('/api/pulls/latest').then(setPull);
    };
    es.onerror = () => setLive(false);
    es.addEventListener('pull:started', (e) => setPull(JSON.parse(e.data)));
    es.addEventListener('pull:completed', (e) => {
      const p = JSON.parse(e.data);
      setPull(p);
      setNotice(`Pull complete: ${p.newTrades} new trades added`);
      loadTrades();
    });
    es.addEventListener('pull:failed', (e) => setPull(JSON.parse(e.data)));
    return () => es.close();
  }, [loadTrades]);

  const startPull = () => getJson('/api/pulls', { method: 'POST' }).then(setPull);
  return { trades, pull, live, notice, loading, startPull, dismissNotice: () => setNotice('') };
}

import { useState } from 'react';
import { useTradesStream } from './useTradesStream.js';

const fmtTime = (iso) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });
const fmtPrice = (n) => n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function App() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { trades, pull, live, notice, loading, startPull, dismissNotice } = useTradesStream({ page, search });
  const inProgress = pull?.status === 'IN_PROGRESS';

  return (
    <main className="container">
      <header>
        <h1>BSE Trades</h1>
        <span className={`badge ${live ? 'ok' : 'off'}`}>{live ? '● Live' : '○ Reconnecting…'}</span>
      </header>

      <section className="status">
        <div>
          <strong>Pull status: </strong>
          {!pull && 'No pulls yet'}
          {inProgress && <>In progress — expected by {fmtTime(pull.expectedAt)}. You can keep browsing.</>}
          {pull?.status === 'COMPLETED' && <>Last pull finished {fmtTime(pull.completedAt)} ({pull.received} received, {pull.newTrades} new)</>}
          {pull?.status === 'FAILED' && <>Failed: {pull.error}</>}
        </div>
        <button onClick={startPull} disabled={inProgress}>{inProgress ? 'Pull running…' : 'Start new pull'}</button>
      </section>

      {notice && <div className="toast" onClick={dismissNotice}>{notice} ✕</div>}

      <div className="toolbar">
        <input
          placeholder="Search symbol, client or trade ID"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <span>{trades.total.toLocaleString()} trades</span>
      </div>

      <table>
        <thead>
          <tr><th>Trade ID</th><th>Client</th><th>Symbol</th><th className="num">Qty</th><th className="num">Price</th><th>Timestamp</th></tr>
        </thead>
        <tbody>
          {trades.data.map((t) => (
            <tr key={t.tradeId}>
              <td>{t.tradeId}</td><td>{t.client}</td><td>{t.symbol}</td>
              <td className="num">{t.quantity}</td><td className="num">{fmtPrice(t.price)}</td><td>{fmtTime(t.timestamp)}</td>
            </tr>
          ))}
          {!loading && trades.data.length === 0 && (
            <tr><td colSpan="6" className="empty">No trades yet — the first pull is still running and they will appear here automatically.</td></tr>
          )}
        </tbody>
      </table>

      <footer>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
        <span>Page {page} of {trades.pages}</span>
        <button disabled={page >= trades.pages} onClick={() => setPage(page + 1)}>Next →</button>
      </footer>
    </main>
  );
}

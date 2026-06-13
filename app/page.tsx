"use client";

import React, { useState, useEffect } from 'react';

interface FuturesQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
  timestamp: number;
}

interface PricePoint {
  time: number;
  price: number;
}

interface StrikeRow {
  strike: number;
  putBid: number;
  putAsk: number;
  callBid: number;
  callAsk: number;
}

interface Position {
  id: number;
  underlying: string;
  strategy: string;
  description: string;
  qty: number;
  credit: number;
  entryPrice: number;
  currentPnl: number;
}

const UNDERLYINGS = ['ZB=F', 'ZN=F'] as const;
type Underlying = typeof UNDERLYINGS[number];

const STRATEGY_OPTIONS = [
  { value: 'short_put', label: 'Short Put' },
  { value: 'short_call', label: 'Short Call' },
  { value: 'put_credit_spread', label: 'Bull Put Credit Spread' },
  { value: 'call_credit_spread', label: 'Bear Call Credit Spread' },
] as const;

type StrategyType = typeof STRATEGY_OPTIONS[number]['value'];

export default function TradeEaseShortOptions() {
  // Live Market Data
  const [quotes, setQuotes] = useState<Record<string, FuturesQuote>>({});
  const [selectedUnderlying, setSelectedUnderlying] = useState<Underlying>('ZN=F');
  const [priceHistory, setPriceHistory] = useState<Record<string, PricePoint[]>>({ 'ZN=F': [], 'ZB=F': [] });
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  // Trading State (demo mode)
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('short_put');
  const [expiration, setExpiration] = useState('2026-06-20');
  const [shortStrike, setShortStrike] = useState(112.5);
  const [longStrike, setLongStrike] = useState(112.0);
  const [quantity, setQuantity] = useState(1);
  const [positions, setPositions] = useState<Position[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentPrice = quotes[selectedUnderlying]?.regularMarketPrice || (selectedUnderlying === 'ZN=F' ? 112.75 : 121.40);
  const currentChange = quotes[selectedUnderlying]?.regularMarketChange || 0;
  const currentChangePct = quotes[selectedUnderlying]?.regularMarketChangePercent || 0;

  // Dynamic strikes around live price
  const generateChain = (price: number): StrikeRow[] => {
    const base = Math.round(price * 2) / 2;
    const strikes: number[] = [];
    for (let i = -6; i <= 6; i++) strikes.push(base + i * 0.5);
    return strikes.map(strike => {
      const dist = Math.abs(strike - price);
      const basePremium = Math.max(0.04, (0.85 - dist * 0.12) + (Math.random() - 0.5) * 0.03);
      const putBid = Math.max(0.03, basePremium * (strike < price ? 1.15 : 0.85));
      const putAsk = putBid + 0.03;
      const callBid = Math.max(0.03, basePremium * (strike > price ? 1.15 : 0.85));
      const callAsk = callBid + 0.03;
      return { strike, putBid, putAsk, callBid, callAsk };
    });
  };

  const chain = generateChain(currentPrice);

  // Live price polling + price chart history
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchPrices = async () => {
      setIsLoadingPrice(true);
      try {
        const res = await fetch('/api/market/quote?symbols=ZB=F,ZN=F');
        const json = await res.json();
        const newQuotes: Record<string, FuturesQuote> = {};
        json.data.forEach((q: any) => {
          newQuotes[q.symbol] = {
            symbol: q.symbol,
            shortName: q.shortName,
            regularMarketPrice: q.regularMarketPrice,
            regularMarketChange: q.regularMarketChange,
            regularMarketChangePercent: q.regularMarketChangePercent,
            regularMarketDayHigh: q.regularMarketDayHigh,
            regularMarketDayLow: q.regularMarketDayLow,
            regularMarketPreviousClose: q.regularMarketPreviousClose,
            timestamp: json.timestamp,
          };
        });
        setQuotes(newQuotes);

        setPriceHistory(prev => {
          const updated = { ...prev };
          (['ZB=F', 'ZN=F'] as const).forEach(sym => {
            const q = newQuotes[sym];
            if (q) {
              const hist = [...(updated[sym] || [])];
              hist.push({ time: Date.now(), price: q.regularMarketPrice });
              if (hist.length > 50) hist.shift();
              updated[sym] = hist;
            }
          });
          return updated;
        });
      } catch (e) {
        // Realistic simulated ticks
        setQuotes(prev => {
          const u: any = { ...prev };
          (['ZB=F', 'ZN=F'] as const).forEach(sym => {
            const base = sym === 'ZN=F' ? 112.8 : 121.5;
            const curr = u[sym]?.regularMarketPrice || base;
            const tick = (Math.random() - 0.5) * (sym === 'ZN=F' ? 0.11 : 0.17);
            const np = Math.max(base - 2.5, Math.min(base + 2.5, curr + tick));
            u[sym] = { ...(u[sym] || { symbol: sym, shortName: sym === 'ZN=F' ? '10Y T-Note' : '30Y Bond' }), regularMarketPrice: np };
          });
          return u;
        });

        setPriceHistory(prev => {
          const u = { ...prev };
          (['ZB=F', 'ZN=F'] as const).forEach(sym => {
            const h = [...(u[sym] || [])];
            const last = h[h.length - 1]?.price || (sym === 'ZN=F' ? 112.8 : 121.5);
            h.push({ time: Date.now(), price: last + (Math.random() - 0.5) * (sym === 'ZN=F' ? 0.11 : 0.17) });
            if (h.length > 50) h.shift();
            u[sym] = h;
          });
          return u;
        });
      }
      setIsLoadingPrice(false);
    };

    fetchPrices();
    interval = setInterval(fetchPrices, 8000);
    return () => clearInterval(interval);
  }, []);

  const currentQuote = quotes[selectedUnderlying];

  // Live calculations
  const calc = React.useMemo(() => {
    const credit = Math.max(0.04, 0.72 - Math.abs(shortStrike - currentPrice) * 0.11);
    const qty = quantity;
    let totalCredit = 0, maxProfit = 0, maxLoss = 0, breakeven = '';

    if (selectedStrategy === 'short_put') {
      totalCredit = credit * 100 * qty;
      maxProfit = totalCredit;
      maxLoss = (shortStrike * 100 * qty) - totalCredit;
      breakeven = (shortStrike - credit).toFixed(2);
    } else if (selectedStrategy === 'short_call') {
      totalCredit = credit * 100 * qty;
      maxProfit = totalCredit;
      maxLoss = 999999;
      breakeven = (shortStrike + credit).toFixed(2);
    } else if (selectedStrategy === 'put_credit_spread') {
      const net = Math.max(0.03, credit - 0.18);
      totalCredit = net * 100 * qty;
      maxProfit = totalCredit;
      maxLoss = Math.max(0.25, shortStrike - longStrike) * 100 * qty - totalCredit;
      breakeven = (shortStrike - net).toFixed(2);
    } else if (selectedStrategy === 'call_credit_spread') {
      const net = Math.max(0.03, credit - 0.18);
      totalCredit = net * 100 * qty;
      maxProfit = totalCredit;
      maxLoss = Math.max(0.25, longStrike - shortStrike) * 100 * qty - totalCredit;
      breakeven = (shortStrike + net).toFixed(2);
    }

    return {
      totalCredit: totalCredit.toFixed(2),
      maxProfit: maxProfit.toFixed(2),
      maxLoss: maxLoss === 999999 ? 'Undefined' : maxLoss.toFixed(2),
      breakeven,
    };
  }, [selectedStrategy, shortStrike, longStrike, quantity, currentPrice]);

  // Simple live-updating SVG chart
  const renderPriceChart = () => {
    const hist = priceHistory[selectedUnderlying] || [];
    if (hist.length < 3) return <div className="h-40 flex items-center justify-center text-zinc-500 text-sm">Loading live price chart…</div>;

    const prices = hist.map(p => p.price);
    const minP = Math.min(...prices), maxP = Math.max(...prices);
    const r = maxP - minP || 0.4;
    const w = 620, h = 170, pad = 6;

    const pts = hist.map((p, i) => {
      const x = pad + (i / (hist.length - 1)) * (w - pad * 2);
      const y = pad + ((maxP - p.price) / r) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const last = hist[hist.length - 1].price;
    const first = hist[0].price;
    const col = last >= first ? '#22c55e' : '#ef4444';

    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <polyline fill="none" stroke={col} strokeWidth="2.25" strokeLinejoin="round" points={pts} />
        <circle cx={w - pad} cy={pad + ((maxP - last) / r) * (h - pad * 2)} r="3" fill={col} />
      </svg>
    );
  };

  const currentSymbolDisplay = selectedUnderlying === 'ZN=F' ? '/ZN (10Y)' : '/ZB (30Y)';

  const chain = generateChain(currentPrice);

  const selectStrike = (strike: number) => {
    if (selectedStrategy === 'short_put' || selectedStrategy === 'short_call') {
      setShortStrike(strike);
    } else {
      setShortStrike(strike);
      setLongStrike(selectedStrategy === 'put_credit_spread' ? strike - 0.5 : strike + 0.5);
    }
  };

  const executeTrade = () => {
    const newP: Position = {
      id: Date.now(),
      underlying: selectedUnderlying,
      strategy: STRATEGY_OPTIONS.find(s => s.value === selectedStrategy)!.label,
      description: `${shortStrike}${selectedStrategy.includes('put') ? 'P' : 'C'}${longStrike ? ` / ${longStrike}` : ''}`,
      qty: quantity,
      credit: parseFloat(calc.totalCredit),
      entryPrice: currentPrice,
      currentPnl: parseFloat(calc.totalCredit) * 0.38,
    };
    setPositions(p => [newP, ...p]);
    setShowConfirm(false);
  };

  const closePos = (id: number) => setPositions(p => p.filter(x => x.id !== id));

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-zinc-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500 flex items-center justify-center">
                <span className="text-black font-bold text-2xl tracking-[-2.5px]">TE</span>
              </div>
              <div>
                <div className="font-semibold text-2xl tracking-tighter">TradeEase</div>
                <div className="text-[10px] text-emerald-400 -mt-1">SHORT OPTIONS • RATES</div>
              </div>
            </div>
            <div className="text-xs px-3 py-1 bg-zinc-900 rounded-full border border-white/10">DEMO MODE • NO LOGIN</div>
          </div>
          <div className="text-xs text-zinc-400">Live data on /ZB &amp; /ZN</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {/* Live Prices + Chart */}
        <div>
          <div className="uppercase text-xs tracking-[2px] text-zinc-400 mb-3">Live Futures Market Data</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {(['ZN=F', 'ZB=F'] as const).map(sym => {
              const q = quotes[sym];
              const sel = selectedUnderlying === sym;
              return (
                <button key={sym} onClick={() => setSelectedUnderlying(sym)}
                  className={`p-5 rounded-3xl border text-left transition ${sel ? 'border-emerald-500 bg-zinc-900' : 'border-white/10 hover:border-white/20 bg-zinc-900/70'}`}>
                  <div className="text-sm text-zinc-400">{sym === 'ZN=F' ? '10-Year T-Note (/ZN)' : '30-Year Bond (/ZB)'}</div>
                  <div className="font-mono text-4xl font-semibold tracking-tighter mt-1">
                    {q ? q.regularMarketPrice.toFixed(3) : '—'}
                  </div>
                  {q && <div className={q.regularMarketChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>{q.regularMarketChange >= 0 ? '+' : ''}{q.regularMarketChange.toFixed(3)} ({q.regularMarketChangePercent.toFixed(2)}%)</div>}
                </button>
              );
            })}
          </div>

          {/* Price Chart */}
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="font-semibold mb-2">{currentSymbolDisplay} Trade Price</div>
            <div className="bg-black/40 rounded-2xl p-3 border border-white/10">
              {renderPriceChart()}
            </div>
            <div className="text-[10px] text-center text-zinc-500 mt-2">Live updating chart (Yahoo proxy + simulated ticks)</div>
          </div>
        </div>

        {/* Strategy Builder */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7">
            <div className="mb-2 text-xs uppercase tracking-[2px] text-zinc-400">Options Chain (centered on live price)</div>
            <div className="rounded-3xl border border-white/10 bg-zinc-900 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-zinc-400">
                    <th className="pl-6 text-left py-3">Strike</th>
                    <th>Put Bid / Ask</th>
                    <th>Call Bid / Ask</th>
                    <th className="pr-6 text-right">Select Short</th>
                  </tr>
                </thead>
                <tbody>
                  {chain.map(r => (
                    <tr key={r.strike} className="border-t border-white/10 hover:bg-zinc-950/50">
                      <td className="pl-6 py-2 font-mono font-medium">{r.strike.toFixed(1)}</td>
                      <td className="text-emerald-400 font-mono">{r.putBid.toFixed(2)} / {r.putAsk.toFixed(2)}</td>
                      <td className="text-emerald-400 font-mono">{r.callBid.toFixed(2)} / {r.callAsk.toFixed(2)}</td>
                      <td className="pr-6 text-right">
                        <button onClick={() => selectStrike(r.strike)} className="text-xs px-3 py-1 rounded-xl border border-white/10 hover:bg-emerald-500 hover:text-black">Select</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="xl:col-span-5">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="uppercase text-xs tracking-widest text-zinc-400 mb-3">Short Options Builder</div>

              <div className="flex flex-wrap gap-2 mb-4">
                {STRATEGY_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => setSelectedStrategy(s.value)} className={`px-4 py-2 text-sm rounded-2xl border transition ${selectedStrategy === s.value ? 'border-emerald-500 bg-zinc-800' : 'border-white/10 hover:bg-zinc-800'}`}>
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-5">
                <div>
                  <div className="text-xs text-zinc-400 mb-1">Expiration</div>
                  <select value={expiration} onChange={e => setExpiration(e.target.value)} className="bg-zinc-900 border border-white/10 w-full rounded-2xl px-3 py-2">
                    <option>2026-06-20</option><option>2026-06-27</option><option>2026-07-18</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1">Contracts</div>
                  <input type="number" value={quantity} min={1} onChange={e => setQuantity(Math.max(1, +e.target.value || 1))} className="bg-zinc-900 border border-white/10 w-full rounded-2xl px-3 py-2" />
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1">Short Strike</div>
                  <input type="number" step="0.25" value={shortStrike} onChange={e => setShortStrike(+e.target.value)} className="bg-zinc-900 border border-white/10 w-full rounded-2xl px-3 py-2 font-mono" />
                </div>
                {selectedStrategy.includes('spread') && (
                  <div>
                    <div className="text-xs text-zinc-400 mb-1">Long Strike</div>
                    <input type="number" step="0.25" value={longStrike} onChange={e => setLongStrike(+e.target.value)} className="bg-zinc-900 border border-white/10 w-full rounded-2xl px-3 py-2 font-mono" />
                  </div>
                )}
              </div>

              <div className="bg-zinc-950 rounded-2xl p-5 border border-white/10 mb-5 text-sm">
                <div className="grid grid-cols-2 gap-y-2">
                  <div>Total Credit</div><div className="font-mono text-emerald-400 text-right">${calc.totalCredit}</div>
                  <div>Max Profit</div><div className="font-mono text-emerald-400 text-right">${calc.maxProfit}</div>
                  <div>Max Loss</div><div className="font-mono text-red-400 text-right">${calc.maxLoss}</div>
                  <div>Breakeven</div><div className="font-mono text-right">{calc.breakeven}</div>
                </div>
              </div>

              <button onClick={() => setShowConfirm(true)} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 transition text-black font-semibold rounded-2xl">
                SIMULATE SHORT OPTIONS TRADE
              </button>
            </div>
          </div>
        </div>

        {/* Positions */}
        <div>
          <div className="font-semibold mb-3">Simulated Open Short Positions</div>
          <div className="rounded-3xl border border-white/10 bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-zinc-400">
                  <th className="pl-6 text-left py-3">Underlying / Strategy</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Credit</th>
                  <th>P/L</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 && <tr><td colSpan={6} className="pl-6 py-6 text-zinc-400">No positions yet. Build and simulate a trade above.</td></tr>}
                {positions.map(p => (
                  <tr key={p.id} className="border-t border-white/10">
                    <td className="pl-6 py-2.5">{p.underlying} — {p.strategy}</td>
                    <td className="font-mono text-xs">{p.description}</td>
                    <td>{p.qty}</td>
                    <td className="text-emerald-400">${p.credit.toFixed(2)}</td>
                    <td className={p.currentPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>${p.currentPnl.toFixed(2)}</td>
                    <td className="pr-6 text-right"><button onClick={() => closePos(p.id)} className="text-xs px-3 py-1 border border-white/10 rounded-xl hover:bg-zinc-800">Close</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-3xl border border-white/10 w-full max-w-md p-7">
            <div className="font-semibold text-xl mb-4">Confirm Simulated Trade</div>
            <div className="text-sm space-y-1 mb-6 text-zinc-300">
              <div className="flex justify-between"><span>Underlying</span><span className="font-mono">{selectedUnderlying}</span></div>
              <div className="flex justify-between"><span>Strategy</span><span>{STRATEGY_OPTIONS.find(s => s.value === selectedStrategy)?.label}</span></div>
              <div className="flex justify-between"><span>Credit</span><span className="text-emerald-400">${calc.totalCredit}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-2xl border border-white/10">Cancel</button>
              <button onClick={executeTrade} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-black font-semibold">Simulate Trade</button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-[10px] text-zinc-500 py-6 border-t border-white/10">
        Live prices from Yahoo Finance (via Next.js proxy). All trading is simulated for educational purposes. No real broker connection.
      </div>
    </div>
  );
}

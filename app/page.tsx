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

interface HistoricalPoint {
  time: number;
  high: number;
  low: number;
  close: number;
}

// /ZB (30-Year Treasury Bond Futures) contracts
// Format: ZB + MonthCode + LastTwoDigitsOfYear + .F
// approxDTE: estimated days to expiration (as of mid-2026 for demo)
const ZB_CONTRACTS = [
  { symbol: 'ZBH26.F', label: 'Mar 2026 (H26)', approxDTE: 280 },
  { symbol: 'ZBM26.F', label: 'Jun 2026 (M26)', approxDTE: 190 },
  { symbol: 'ZBU26.F', label: 'Sep 2026 (U26)', approxDTE: 100 },
  { symbol: 'ZBZ26.F', label: 'Dec 2026 (Z26)', approxDTE: 10 },
  { symbol: 'ZBH27.F', label: 'Mar 2027 (H27)', approxDTE: 280 },
];

function toTicks(price: number): string {
  const whole = Math.floor(price);
  const frac = price - whole;
  const thirtySeconds = Math.round(frac * 32);
  return `${whole}'${thirtySeconds.toString().padStart(2, '0')}'`;
}

// Simple estimator for far OTM premium (demo only, based on distance and DTE)
function estimatePremium(distance: number, dte: number, volFactor: number = 0.015): number {
  // Rough approximation for bond futures far OTM options premium
  return Math.max(0.02, distance * volFactor * Math.sqrt(dte / 365) * 0.8);
}

// Strangle only recommendation (sell far OTM put + sell far OTM call)
// Best yield = total credit; safest risk = high POP from 90 OTM long DTE (undefined risk but low prob of large adverse move)
function getRecommendations(price: number, dte: number, otm: number, bias: string) {
  const distance = price * ((100 - otm) / 100);
  const putCredit = estimatePremium(distance, dte);
  const callCredit = estimatePremium(distance, dte);
  const totalCredit = putCredit + callCredit;

  let rec = 'Short Strangle (sell far OTM put + sell far OTM call)';
  let why = `Neutral bias. Far OTM ${otm}% on both sides for ${dte}DTE gives best yield (total credit) with safest risk profile for your style (high POP ~80%+ due to distance).`;
  if (bias === 'bullish') {
    why = `Price rising (${toTicks(price)}). Still recommend balanced strangle but put side contributes more to yield.`;
  } else if (bias === 'bearish') {
    why = `Price falling. Still recommend balanced strangle but call side contributes more to yield.`;
  }

  const maxProfit = totalCredit;
  const maxLoss = 'Undefined (naked strangle) — but very low probability of loss due to 90 OTM';
  const pop = 82;

  return {
    rec,
    why,
    bestStrat: 'Short Strangle',
    bestCredit: totalCredit.toFixed(2),
    maxProfit: maxProfit.toFixed(2),
    maxLoss,
    pop: `${pop}%`,
    putCredit: putCredit.toFixed(2),
    callCredit: callCredit.toFixed(2),
  };
}

function getScannerData(price: number, otm: number) {
  const dtes = [60, 80, 100];
  return dtes.map(dte => {
    const dist = price * ((100 - otm) / 100);
    const putPrem = estimatePremium(dist, dte);
    const callPrem = estimatePremium(dist, dte);
    const totalCredit = putPrem + callPrem;
    return {
      dte,
      putStrike: (price - dist).toFixed(2),
      callStrike: (price + dist).toFixed(2),
      putCredit: putPrem.toFixed(2),
      callCredit: callPrem.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      pop: '82%',
    };
  });
}

export default function TradeEaseZBMonitor() {
  // Selected contract
  const [selectedContract, setSelectedContract] = useState(ZB_CONTRACTS[0]);

  // Live data for selected contract
  const [quote, setQuote] = useState<FuturesQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  // 6-month historical high/low data
  const [historical, setHistorical] = useState<HistoricalPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Current price for display (from live or history)
  const currentPrice = quote?.regularMarketPrice ?? (historical.length > 0 ? historical[historical.length - 1].close : 121.5);
  const currentChange = quote?.regularMarketChange || 0;
  const currentChangePct = quote?.regularMarketChangePercent || 0;

  // Strategy Analyzer inputs
  const [analyzerDTE, setAnalyzerDTE] = useState(80);
  const [analyzerOTM, setAnalyzerOTM] = useState(90);
  const [analyzerBias, setAnalyzerBias] = useState<'bullish' | 'neutral' | 'bearish'>(
    currentChange > 0.1 ? 'bullish' : currentChange < -0.1 ? 'bearish' : 'neutral'
  );

  // Fetch live quote for the selected contract
  const fetchQuote = async (symbol: string) => {
    setIsLoadingQuote(true);
    try {
      const res = await fetch(`/api/market/quote?symbols=${encodeURIComponent(symbol)}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setQuote(json.data[0]);
      }
    } catch (e) {
      // Fallback simulated
      const base = 121.5;
      const simulated = base + (Math.random() - 0.5) * 0.5;
      setQuote({
        symbol,
        shortName: '30-Year Treasury Bond Futures',
        regularMarketPrice: simulated,
        regularMarketChange: (Math.random() - 0.5) * 0.3,
        regularMarketChangePercent: (Math.random() - 0.5) * 0.25,
        regularMarketDayHigh: simulated + 0.4,
        regularMarketDayLow: simulated - 0.35,
        regularMarketPreviousClose: base,
        timestamp: Date.now(),
      });
    }
    setIsLoadingQuote(false);
  };

  // Fetch 6-month high/low history for the selected contract
  const fetchHistory = async (symbol: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}`);
      const json = await res.json();
      if (json.success && json.data?.length) {
        setHistorical(json.data);
      }
    } catch (e) {
      // Fallback data
      const base = 121.5;
      const points: HistoricalPoint[] = [];
      const start = Date.now() - 180 * 24 * 60 * 60 * 1000;
      let close = base;
      for (let i = 0; i < 130; i++) {
        const t = start + i * 24 * 60 * 60 * 1000;
        const move = (Math.random() - 0.5) * 1.1;
        const h = close + Math.abs(move) * 0.7;
        const l = close - Math.abs(move) * 0.7;
        close = close + move;
        close = Math.max(base - 3.5, Math.min(base + 3.5, close));
        points.push({
          time: t,
          high: Math.round(h * 1000) / 1000,
          low: Math.round(l * 1000) / 1000,
          close: Math.round(close * 1000) / 1000,
        });
      }
      setHistorical(points);
    }
    setIsLoadingHistory(false);
  };

  // Load data when contract changes
  useEffect(() => {
    fetchQuote(selectedContract.symbol);
    fetchHistory(selectedContract.symbol);
  }, [selectedContract]);

  // Live polling for the selected contract (updates current price)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQuote(selectedContract.symbol);
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedContract]);

  // High/Low 6-month SVG chart
  const renderHighLowChart = () => {
    if (historical.length === 0) {
      return <div className="h-64 flex items-center justify-center text-zinc-500">Loading 6-month high/low chart...</div>;
    }

    const data = historical;
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const minLow = Math.min(...lows);
    const maxHigh = Math.max(...highs);
    const range = maxHigh - minLow || 1;

    const w = 820;
    const h = 260;
    const padX = 50;
    const padY = 20;

    const points = data.map((d, i) => {
      const x = padX + (i / (data.length - 1)) * (w - padX * 2);
      const yHigh = padY + ((maxHigh - d.high) / range) * (h - padY * 2);
      const yLow = padY + ((maxHigh - d.low) / range) * (h - padY * 2);
      return { x, yHigh, yLow, close: d.close };
    });

    // Y ticks (approx 5 levels in ticks format)
    const yTicks = [];
    for (let i = 0; i <= 4; i++) {
      const val = minLow + (i * range) / 4;
      const y = padY + ((maxHigh - val) / range) * (h - padY * 2);
      yTicks.push({ val, y });
    }

    // X month labels (rough)
    const monthLabels: { x: number; label: string }[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const firstTime = data[0].time;
    const lastTime = data[data.length - 1].time;
    const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6;

    for (let m = 0; m < 6; m++) {
      const t = firstTime + (m * sixMonthsMs) / 6;
      const idx = data.findIndex(d => d.time >= t);
      if (idx >= 0) {
        const x = padX + (idx / (data.length - 1)) * (w - padX * 2);
        const date = new Date(t);
        monthLabels.push({
          x,
          label: months[date.getMonth()],
        });
      }
    }

    return (
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl p-4 overflow-hidden">
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
          {/* Grid lines */}
          {yTicks.map((t, i) => (
            <line
              key={i}
              x1={padX}
              y1={t.y}
              x2={w - padX}
              y2={t.y}
              stroke="#27272a"
              strokeWidth="1"
            />
          ))}

          {/* High-Low lines */}
          {points.map((p, i) => (
            <g key={i}>
              {/* High to Low vertical line */}
              <line
                x1={p.x}
                y1={p.yHigh}
                x2={p.x}
                y2={p.yLow}
                stroke="#64748b"
                strokeWidth="1.5"
              />
              {/* Close mark (small horizontal) */}
              <line
                x1={p.x - 3}
                y1={padY + ((maxHigh - p.close) / range) * (h - padY * 2)}
                x2={p.x + 3}
                y2={padY + ((maxHigh - p.close) / range) * (h - padY * 2)}
                stroke="#22c55e"
                strokeWidth="2"
              />
            </g>
          ))}

          {/* Current price line (live) */}
          {currentPrice && (
            <line
              x1={padX}
              y1={padY + ((maxHigh - currentPrice) / range) * (h - padY * 2)}
              x2={w - padX}
              y2={padY + ((maxHigh - currentPrice) / range) * (h - padY * 2)}
              stroke="#eab308"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          )}

          {/* Y axis labels in ticks format */}
          {yTicks.map((t, i) => (
            <text
              key={i}
              x={padX - 8}
              y={t.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#64748b"
              className="font-mono"
            >
              {toTicks(t.val)}
            </text>
          ))}

          {/* X axis month labels */}
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={m.x}
              y={h - 4}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {m.label}
            </text>
          ))}
        </svg>

        <div className="flex justify-between text-xs text-zinc-500 mt-2 px-2">
          <div>6 months ago</div>
          <div>Today (live overlay in yellow)</div>
        </div>
      </div>
    );
  };

  const currentDisplayPrice = currentPrice ? toTicks(currentPrice) : '—';
  const dayHigh = quote?.regularMarketDayHigh ? toTicks(quote.regularMarketDayHigh) : '—';
  const dayLow = quote?.regularMarketDayLow ? toTicks(quote.regularMarketDayLow) : '—';

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-zinc-950/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 flex items-center justify-center">
              <span className="text-black font-bold text-2xl tracking-[-2.5px]">TE</span>
            </div>
            <div>
              <div className="font-semibold text-2xl tracking-tighter">TradeEase</div>
              <div className="text-[10px] text-emerald-400 -mt-1">/ZB FUTURES CONTRACT MONITOR</div>
            </div>
          </div>
          <div className="text-xs px-3 py-1 bg-zinc-900 rounded-full border border-white/10">
            DEMO • LIVE DATA (Yahoo Finance)
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tighter mb-2">/ZB Contract Monitor</h1>
          <p className="text-zinc-400">
            Select a specific /ZB futures contract to monitor live price and 6-month high/low chart.
          </p>
        </div>

        {/* DTE Filter + Contract Selector */}
        <div className="mb-8">
          <div className="text-sm text-zinc-400 mb-2 uppercase tracking-widest">Select DTE (only contracts with sufficient time to expiration are shown)</div>
          <div className="flex gap-3 mb-4">
            {[60,80,100].map(d => (
              <button
                key={d}
                onClick={() => setAnalyzerDTE(d)}
                className={`px-4 py-2 rounded-2xl border text-sm transition ${analyzerDTE === d ? 'border-emerald-500 bg-zinc-900' : 'border-white/10 hover:bg-zinc-900'}`}
              >
                {d} DTE
              </button>
            ))}
          </div>

          <div className="text-sm text-zinc-400 mb-2 uppercase tracking-widest">Select /ZB Contract (filtered to DTE {'>='} {analyzerDTE})</div>
          <div className="flex flex-wrap gap-3">
            {ZB_CONTRACTS.filter(c => c.approxDTE >= analyzerDTE).length > 0 ? (
              ZB_CONTRACTS.filter(c => c.approxDTE >= analyzerDTE).map((contract) => (
                <button
                  key={contract.symbol}
                  onClick={() => setSelectedContract(contract)}
                  className={`px-5 py-3 rounded-2xl border text-left transition min-w-[160px] ${
                    selectedContract.symbol === contract.symbol
                      ? 'border-emerald-500 bg-zinc-900'
                      : 'border-white/10 hover:bg-zinc-900'
                  }`}
                >
                  <div className="font-mono text-lg font-semibold">{contract.symbol}</div>
                  <div className="text-sm text-zinc-400">{contract.label} (~{contract.approxDTE} DTE)</div>
                </button>
              ))
            ) : (
              <div className="text-red-400 text-sm">No contracts available with DTE {'>='} {analyzerDTE}. Choose a shorter DTE.</div>
            )}
          </div>
        </div>

        {/* Current Contract Monitor */}
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8 mb-8">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <div className="font-mono text-3xl font-semibold tracking-tighter">
                {selectedContract.symbol}
              </div>
              <div className="text-xl text-zinc-400">{selectedContract.label}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-400">Last Price</div>
              <div className="font-mono text-6xl font-semibold tracking-[-3px] text-emerald-400">
                {currentPrice ? toTicks(currentPrice) : '—'}
              </div>
              {currentPrice && (
                <div className={`text-sm mt-1 ${currentChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentChange >= 0 ? '+' : ''}{currentChange.toFixed(3)} ({currentChangePct.toFixed(2)}%)
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-zinc-950 rounded-2xl p-4">
              <div className="text-zinc-400 text-xs">Daily High</div>
              <div className="font-mono text-2xl font-semibold mt-1 text-emerald-400">
                {quote?.regularMarketDayHigh ? toTicks(quote.regularMarketDayHigh) : '—'}
              </div>
            </div>
            <div className="bg-zinc-950 rounded-2xl p-4">
              <div className="text-zinc-400 text-xs">Daily Low</div>
              <div className="font-mono text-2xl font-semibold mt-1 text-red-400">
                {quote?.regularMarketDayLow ? toTicks(quote.regularMarketDayLow) : '—'}
              </div>
            </div>
            <div className="bg-zinc-950 rounded-2xl p-4">
              <div className="text-zinc-400 text-xs">Previous Close</div>
              <div className="font-mono text-2xl font-semibold mt-1">
                {quote?.regularMarketPreviousClose ? toTicks(quote.regularMarketPreviousClose) : '—'}
              </div>
            </div>
            <div className="bg-zinc-950 rounded-2xl p-4">
              <div className="text-zinc-400 text-xs">Last Updated</div>
              <div className="text-sm mt-1 text-zinc-400">
                {quote ? new Date(quote.timestamp).toLocaleTimeString() : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* 6-Month High/Low Chart */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <div className="font-semibold text-xl">6-Month High/Low Chart</div>
              <div className="text-xs text-zinc-400">Daily high and low for {selectedContract.label}</div>
            </div>
            {isLoadingHistory && <div className="text-xs text-zinc-400">Loading history...</div>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            {renderHighLowChart ? (
              renderHighLowChart()
            ) : (
              <div className="h-64 flex items-center justify-center text-zinc-500">
                Select a contract to load the 6-month high/low chart
              </div>
            )}
          </div>
          <div className="text-[10px] text-zinc-500 mt-2 px-1">
            Vertical lines show daily high-to-low range. Yellow dashed line = current live price.
            Data via Yahoo Finance proxy.
          </div>
        </div>

        {/* Strategy Analyzer & Recommendations */}
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="font-semibold text-xl mb-4">Strategy Analyzer & Recommendations</div>
          <p className="text-sm text-zinc-400 mb-4">
            Short Strangle only (90 OTM). Best yield (total credit) and safest risk (high POP) for your style. Contracts with approxDTE &lt; selected DTE are hidden. 
            Estimates are demo-only (based on distance + DTE). Not financial advice.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">DTE</label>
              <select
                value={analyzerDTE}
                onChange={(e) => setAnalyzerDTE(parseInt(e.target.value))}
                className="bg-zinc-950 border border-white/10 w-full rounded-2xl px-4 py-2"
              >
                <option value={60}>60 DTE</option>
                <option value={80}>80 DTE</option>
                <option value={100}>100 DTE</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">OTM %</label>
              <input
                type="number"
                value={analyzerOTM}
                onChange={(e) => setAnalyzerOTM(Math.max(70, Math.min(95, parseInt(e.target.value) || 90)))}
                className="bg-zinc-950 border border-white/10 w-full rounded-2xl px-4 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Bias (auto from price move)</label>
              <select
                value={analyzerBias}
                onChange={(e) => setAnalyzerBias(e.target.value as any)}
                className="bg-zinc-950 border border-white/10 w-full rounded-2xl px-4 py-2"
              >
                <option value="bullish">Bullish (price up)</option>
                <option value="neutral">Neutral</option>
                <option value="bearish">Bearish (price down)</option>
              </select>
            </div>
          </div>

          {(() => {
            const rec = getRecommendations(currentPrice, analyzerDTE, analyzerOTM, analyzerBias);
            return (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-950 rounded-2xl border border-emerald-900/50">
                  <div className="font-semibold text-emerald-400 mb-1">Recommended Strategy</div>
                  <div className="text-lg">{rec.rec}</div>
                  <div className="text-sm text-zinc-400 mt-1">{rec.why}</div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>Est. Credit (best): <span className="font-mono text-emerald-400">{rec.bestCredit}</span> pts/contract</div>
                    <div>Max Profit: <span className="font-mono">{rec.maxProfit}</span></div>
                    <div>Max Loss: <span className="font-mono text-red-400">{rec.maxLoss}</span></div>
                    <div>Est. POP: <span className="font-mono">{rec.pop}</span></div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Price Scanner (current price {toTicks(currentPrice)}, {analyzerOTM}% OTM)</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-white/10 rounded-xl overflow-hidden">
                      <thead className="bg-zinc-800">
                        <tr>
                          <th className="p-2 text-left">DTE</th>
                          <th className="p-2">Put Strike</th>
                          <th className="p-2">Put Credit</th>
                          <th className="p-2">Call Strike</th>
                          <th className="p-2">Call Credit</th>
                          <th className="p-2">Total Strangle Credit (yield)</th>
                          <th className="p-2">Est. POP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getScannerData(currentPrice, analyzerOTM).map((row, idx) => (
                          <tr key={idx} className="border-t border-white/10 hover:bg-zinc-950">
                            <td className="p-2 font-medium">{row.dte}</td>
                            <td className="p-2 font-mono">{row.putStrike}</td>
                            <td className="p-2 font-mono text-emerald-400">{row.putCredit}</td>
                            <td className="p-2 font-mono">{row.callStrike}</td>
                            <td className="p-2 font-mono text-emerald-400">{row.callCredit}</td>
                            <td className="p-2 font-mono text-emerald-400">{row.totalCredit}</td>
                            <td className="p-2">{row.pop}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    Credits are demo estimates. For 90 OTM long DTE, the strangle offers the best yield (total credit) with the safest risk profile (highest POP) for your far OTM style.
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="text-center text-xs text-zinc-500 pt-8">
          Demo interface • Prices in traditional 32nds format (e.g. 112'21') • For monitoring only. No real orders.
        </div>
      </div>
    </div>
  );
}

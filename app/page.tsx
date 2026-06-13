"use client";

import React, { useState } from "react";

// Types
interface OptionStrike {
  strike: number;
  callBid: number;
  callAsk: number;
  putBid: number;
  putAsk: number;
  iv: number;
}

interface Position {
  id: number;
  symbol: string;
  strategy: string;
  strikes: string;
  qty: number;
  credit: number;
  currentValue: number;
  unrealizedPnl: number;
}

interface Strategy {
  key: string;
  label: string;
  description: string;
}

const STRATEGIES: Strategy[] = [
  { key: "short_put", label: "Short Put", description: "Sell put to collect premium (bullish/neutral)" },
  { key: "short_call", label: "Short Call", description: "Sell call to collect premium (bearish/neutral)" },
  { key: "bull_put_spread", label: "Bull Put Credit Spread", description: "Sell higher put, buy lower put (defined risk)" },
  { key: "bear_call_spread", label: "Bear Call Credit Spread", description: "Sell lower call, buy higher call (defined risk)" },
  { key: "short_iron_condor", label: "Short Iron Condor", description: "Sell put spread + sell call spread (range bound)" },
];

// Mock realistic SPY options chain (near ATM for a short-dated expiration)
const MOCK_SPY_CHAIN: OptionStrike[] = [
  { strike: 578, callBid: 4.85, callAsk: 4.95, putBid: 1.12, putAsk: 1.18, iv: 0.142 },
  { strike: 580, callBid: 3.55, callAsk: 3.65, putBid: 1.55, putAsk: 1.62, iv: 0.141 },
  { strike: 582, callBid: 2.48, callAsk: 2.55, putBid: 2.12, putAsk: 2.20, iv: 0.139 },
  { strike: 584, callBid: 1.65, callAsk: 1.72, putBid: 2.90, putAsk: 3.00, iv: 0.138 },
  { strike: 586, callBid: 1.02, callAsk: 1.08, putBid: 3.90, putAsk: 4.05, iv: 0.137 },
  { strike: 588, callBid: 0.58, callAsk: 0.63, putBid: 5.15, putAsk: 5.30, iv: 0.136 },
  { strike: 590, callBid: 0.32, callAsk: 0.36, putBid: 6.60, putAsk: 6.80, iv: 0.135 },
];

const MOCK_POSITIONS: Position[] = [
  { id: 1, symbol: "SPY", strategy: "Bull Put Credit Spread", strikes: "580/578 Put", qty: 2, credit: 148, currentValue: 92, unrealizedPnl: 56 },
  { id: 2, symbol: "SPY", strategy: "Short Iron Condor", strikes: "578/580 | 590/592", qty: 1, credit: 312, currentValue: 245, unrealizedPnl: 67 },
];

export default function TradeEaseShortOptions() {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState({ cash: 12450, buyingPower: 24800, dayPl: 187 });

  // Chain & symbol
  const [symbol, setSymbol] = useState("SPY");
  const [expiration, setExpiration] = useState("2026-06-20"); // near term
  const [chain, setChain] = useState<OptionStrike[]>(MOCK_SPY_CHAIN);
  const [isLoadingChain, setIsLoadingChain] = useState(false);

  // Strategy builder
  const [selectedStrategy, setSelectedStrategy] = useState("bull_put_spread");
  const [shortStrike, setShortStrike] = useState(580);
  const [longStrike, setLongStrike] = useState(578);
  const [quantity, setQuantity] = useState(1);

  // Positions
  const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);

  // Order modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderLegs, setOrderLegs] = useState<any[]>([]);

  // Calculations for the current strategy
  const calculations = React.useMemo(() => {
    const shortLeg = chain.find((s) => s.strike === shortStrike);
    const longLeg = chain.find((s) => s.strike === longStrike);

    if (!shortLeg) return null;

    let creditPerContract = 0;
    let maxProfit = 0;
    let maxLoss = 0;
    let breakeven: string[] = [];
    let description = "";

    const qty = quantity;

    switch (selectedStrategy) {
      case "short_put": {
        creditPerContract = shortLeg.putBid;
        maxProfit = creditPerContract * 100 * qty;
        maxLoss = (shortStrike * 100 * qty) - maxProfit; // theoretical, undefined risk
        breakeven = [`${(shortStrike - creditPerContract).toFixed(2)} (put)`];
        description = `Short ${qty} × ${shortStrike} Put @ ${creditPerContract.toFixed(2)} credit`;
        break;
      }
      case "short_call": {
        creditPerContract = shortLeg.callBid;
        maxProfit = creditPerContract * 100 * qty;
        maxLoss = 999999; // undefined
        breakeven = [`${(shortStrike + creditPerContract).toFixed(2)} (call)`];
        description = `Short ${qty} × ${shortStrike} Call @ ${creditPerContract.toFixed(2)} credit`;
        break;
      }
      case "bull_put_spread": {
        const credit = shortLeg.putBid - (longLeg?.putAsk || shortLeg.putBid * 0.3);
        creditPerContract = Math.max(0.05, credit);
        maxProfit = creditPerContract * 100 * qty;
        const width = shortStrike - longStrike;
        maxLoss = (width * 100 * qty) - maxProfit;
        breakeven = [`${(shortStrike - creditPerContract).toFixed(2)}`];
        description = `Sell ${shortStrike} Put / Buy ${longStrike} Put • ${qty} contract(s)`;
        break;
      }
      case "bear_call_spread": {
        const credit = shortLeg.callBid - (longLeg?.callAsk || shortLeg.callBid * 0.3);
        creditPerContract = Math.max(0.05, credit);
        maxProfit = creditPerContract * 100 * qty;
        const width = longStrike - shortStrike;
        maxLoss = (width * 100 * qty) - maxProfit;
        breakeven = [`${(shortStrike + creditPerContract).toFixed(2)}`];
        description = `Sell ${shortStrike} Call / Buy ${longStrike} Call • ${qty} contract(s)`;
        break;
      }
      case "short_iron_condor": {
        const putCredit = shortLeg.putBid - (longLeg?.putAsk || shortLeg.putBid * 0.25);
        const callCredit = shortLeg.callBid - (longLeg?.callAsk || shortLeg.callBid * 0.25);
        creditPerContract = Math.max(0.10, putCredit + callCredit);
        maxProfit = creditPerContract * 100 * qty;
        const putWidth = shortStrike - (longLeg?.strike || shortStrike - 2);
        const callWidth = (longLeg?.strike || shortStrike + 2) - shortStrike;
        maxLoss = Math.max(putWidth, callWidth) * 100 * qty - maxProfit;
        breakeven = [
          `${(shortStrike - creditPerContract).toFixed(2)} (put side)`,
          `${(shortStrike + creditPerContract).toFixed(2)} (call side)`,
        ];
        description = `Short Iron Condor ${qty}× @ ${creditPerContract.toFixed(2)} total credit`;
        break;
      }
      default:
        return null;
    }

    const totalCredit = creditPerContract * 100 * qty;

    return {
      totalCredit: totalCredit.toFixed(2),
      maxProfit: maxProfit.toFixed(2),
      maxLoss: maxLoss === 999999 ? "Undefined (naked)" : maxLoss.toFixed(2),
      breakeven: breakeven.join(" / "),
      creditPerContract: creditPerContract.toFixed(2),
      description,
      roiOnRisk: maxLoss !== 999999 ? ((maxProfit / maxLoss) * 100).toFixed(1) : "N/A",
    };
  }, [selectedStrategy, shortStrike, longStrike, quantity, chain]);

  // Load mock chain (in real app this would call Tastytrade API)
  const loadChain = async () => {
    setIsLoadingChain(true);
    // Simulate API latency
    await new Promise((r) => setTimeout(r, 420));
    setChain(MOCK_SPY_CHAIN);
    setIsLoadingChain(false);
  };

  // Tastytrade connection (demo mode - ready for real proxy)
  const [loginLoading, setLoginLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleConnectTastytrade = async () => {
    if (!username || !password) {
      alert("Please enter your Tastytrade username and password (use paper trading credentials for safety)");
      return;
    }

    setLoginLoading(true);

    // TODO: Replace this with real proxy to Tastytrade API
    // Example real flow (in /api/tastytrade/login):
    // const res = await fetch('/api/tastytrade/login', { method: 'POST', body: JSON.stringify({ login: username, password }) });
    // const { token } = await res.json();
    // Store token securely (httpOnly cookie recommended)

    // For now: Demo login that unlocks live-feeling data
    await new Promise((r) => setTimeout(r, 650));

    setIsConnected(true);
    setAccount({ cash: 12450 + Math.random() * 300, buyingPower: 24800, dayPl: 187 + Math.floor(Math.random() * 120) });
    setPositions(MOCK_POSITIONS);
    setLoginLoading(false);
    setUsername("");
    setPassword("");

    // Auto-load chain
    if (chain.length === 0) loadChain();
  };

  // Select strike for strategy
  const selectForStrategy = (strike: number, side: "put" | "call") => {
    if (selectedStrategy === "short_put" || selectedStrategy === "short_call") {
      setShortStrike(strike);
    } else {
      // For spreads/condors, set short leg first, then long leg 2-4 points away
      if (!shortStrike || Math.abs(shortStrike - strike) < 2) {
        setShortStrike(strike);
        // Auto suggest long leg
        const suggestedLong = selectedStrategy.includes("put") 
          ? Math.max(578, strike - 2) 
          : Math.min(592, strike + 2);
        setLongStrike(suggestedLong);
      } else {
        setLongStrike(strike);
      }
    }
  };

  // Open order preview modal
  const openOrderPreview = () => {
    if (!calculations) return;

    const legs = buildOrderLegs();
    setOrderLegs(legs);
    setShowOrderModal(true);
  };

  const buildOrderLegs = () => {
    const legs: any[] = [];
    const qty = quantity;

    if (selectedStrategy === "short_put") {
      legs.push({ action: "SELL_TO_OPEN", instrument: `SPY ${expiration} ${shortStrike} Put`, qty });
    } else if (selectedStrategy === "short_call") {
      legs.push({ action: "SELL_TO_OPEN", instrument: `SPY ${expiration} ${shortStrike} Call`, qty });
    } else if (selectedStrategy === "bull_put_spread") {
      legs.push({ action: "SELL_TO_OPEN", instrument: `SPY ${expiration} ${shortStrike} Put`, qty });
      legs.push({ action: "BUY_TO_OPEN", instrument: `SPY ${expiration} ${longStrike} Put`, qty });
    } else if (selectedStrategy === "bear_call_spread") {
      legs.push({ action: "SELL_TO_OPEN", instrument: `SPY ${expiration} ${shortStrike} Call`, qty });
      legs.push({ action: "BUY_TO_OPEN", instrument: `SPY ${expiration} ${longStrike} Call`, qty });
    } else if (selectedStrategy === "short_iron_condor") {
      legs.push({ action: "SELL_TO_OPEN", instrument: `SPY ${expiration} ${shortStrike} Put`, qty });
      legs.push({ action: "BUY_TO_OPEN", instrument: `SPY ${expiration} ${longStrike} Put`, qty });
      legs.push({ action: "SELL_TO_OPEN", instrument: `SPY ${expiration} ${shortStrike} Call`, qty });
      legs.push({ action: "BUY_TO_OPEN", instrument: `SPY ${expiration} ${longStrike} Call`, qty });
    }
    return legs;
  };

  // "Submit" order (demo mode - adds to positions)
  const submitOrder = () => {
    if (!calculations) return;

    const newPosition: Position = {
      id: Date.now(),
      symbol: "SPY",
      strategy: STRATEGIES.find((s) => s.key === selectedStrategy)?.label || selectedStrategy,
      strikes: selectedStrategy.includes("spread") || selectedStrategy.includes("condor")
        ? `${shortStrike}/${longStrike}`
        : `${shortStrike}`,
      qty: quantity,
      credit: parseFloat(calculations.totalCredit),
      currentValue: parseFloat(calculations.totalCredit) * 0.65,
      unrealizedPnl: parseFloat(calculations.totalCredit) * 0.35,
    };

    setPositions((prev) => [...prev, newPosition]);
    setShowOrderModal(false);

    // Update account buying power slightly
    setAccount((prev) => ({
      ...prev,
      buyingPower: Math.max(5000, prev.buyingPower - parseFloat(calculations.maxLoss) * 0.8),
    }));

    alert(`Order submitted to Tastytrade (DEMO MODE).\n\nIn production this would call the real /orders endpoint using your session token.`);
  };

  // Close a position (demo)
  const closePosition = (id: number) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  // Load realistic chain
  const handleLoadChain = () => {
    loadChain();
  };

  const currentCalc = calculations;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-zinc-950/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 flex items-center justify-center">
              <span className="text-black font-bold text-2xl tracking-[-3px]">TE</span>
            </div>
            <div>
              <div className="font-semibold text-2xl tracking-tighter">TradeEase</div>
              <div className="text-[10px] text-emerald-400 -mt-1">SHORT OPTIONS TERMINAL</div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 text-xs">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              PAPER TRADING • TASTYTRADE
            </div>

            {isConnected && (
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-zinc-400">BP</span> <span className="font-mono number">${account.buyingPower.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-emerald-400">+${account.dayPl}</span>
                </div>
              </div>
            )}

            <div className="text-xs px-3 py-1 bg-zinc-900 rounded-full">v0.1 • Demo</div>
          </div>
        </div>
      </header>

      {/* Strong Disclaimer */}
      <div className="bg-red-950/40 border-b border-red-900/50 text-red-400 text-xs py-2 px-6 text-center">
        <strong>⚠️ HIGH RISK:</strong> Short options trading (naked or defined-risk) can result in substantial or unlimited losses. 
        This is a <strong>demonstration interface only</strong>. Use a Tastytrade <strong>paper trading account</strong>. 
        Never trade with real money using unvetted interfaces.
      </div>

      {/* Connection / Account Bar */}
      <div className="border-b border-white/10 bg-zinc-900/60">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {!isConnected ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-semibold text-lg">Connect Tastytrade Account</div>
                  <div className="text-sm text-zinc-400">Paper trading recommended. Real credentials will be sent through a secure server proxy.</div>
                </div>
                <div className="text-xs px-3 py-1 bg-zinc-950 rounded-full">API Ready</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl">
                <input
                  type="text"
                  placeholder="Tastytrade username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-black border border-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black border border-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleConnectTastytrade}
                  disabled={loginLoading}
                  className="trade-button disabled:bg-zinc-800 disabled:text-white"
                >
                  {loginLoading ? "Connecting..." : "Connect to Tastytrade"}
                </button>
              </div>

              <div className="text-[10px] text-zinc-500 mt-3">
                Real integration: Your credentials go through a Next.js API route → Tastytrade /sessions. 
                Token is stored server-side (recommended: httpOnly cookie). See <code>app/api/tastytrade</code> for the proxy.
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <div>
                Connected as <span className="font-mono text-emerald-400">SSDillon95</span> (Paper Account)
              </div>
              <button
                onClick={() => {
                  setIsConnected(false);
                  setPositions([]);
                }}
                className="text-xs px-3 py-1 hover:bg-zinc-800 rounded-lg border border-white/10"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {isConnected && (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Symbol + Chain Controls */}
          <div className="flex items-end gap-4">
            <div>
              <div className="text-xs uppercase tracking-[2px] text-zinc-400 mb-1.5">UNDERLYING</div>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="bg-zinc-900 border border-white/10 w-28 text-3xl font-semibold tracking-tighter rounded-2xl px-5 py-2 focus:outline-none"
              />
            </div>

            <div>
              <div className="text-xs uppercase tracking-[2px] text-zinc-400 mb-1.5">EXPIRATION</div>
              <select
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3 text-sm"
              >
                <option value="2026-06-20">Jun 20 2026 (0DTE-style)</option>
                <option value="2026-06-27">Jun 27 2026</option>
                <option value="2026-07-18">Jul 18 2026</option>
              </select>
            </div>

            <button
              onClick={handleLoadChain}
              disabled={isLoadingChain}
              className="h-12 px-8 rounded-2xl border border-white/10 hover:bg-white hover:text-black transition text-sm font-medium"
            >
              {isLoadingChain ? "Loading..." : "Load Options Chain"}
            </button>

            <div className="text-xs text-zinc-400 self-end pb-1 pl-2">Mock data for demo • Swap with real Tastytrade /market-data calls</div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Options Chain */}
            <div className="xl:col-span-7">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="uppercase text-xs tracking-[2px] text-zinc-400">Options Chain • {symbol} {expiration}</div>
                <div className="text-xs text-zinc-400">Click strikes to build strategy</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900 overflow-hidden">
                <table className="trading-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left pl-6">Strike</th>
                      <th>Call Bid / Ask</th>
                      <th>Put Bid / Ask</th>
                      <th>IV</th>
                      <th className="pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chain.map((row) => (
                      <tr key={row.strike} className="hover:bg-zinc-950/60">
                        <td className="pl-6 font-mono number font-semibold">{row.strike}</td>
                        <td className="text-emerald-400">{row.callBid.toFixed(2)} / {row.callAsk.toFixed(2)}</td>
                        <td className="text-emerald-400">{row.putBid.toFixed(2)} / {row.putAsk.toFixed(2)}</td>
                        <td className="text-amber-400">{(row.iv * 100).toFixed(1)}%</td>
                        <td className="pr-6 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => selectForStrategy(row.strike, "put")}
                              className="text-xs px-3 py-1 rounded-lg border border-white/10 hover:bg-emerald-500 hover:text-black"
                            >
                              Short Put
                            </button>
                            <button 
                              onClick={() => selectForStrategy(row.strike, "call")}
                              className="text-xs px-3 py-1 rounded-lg border border-white/10 hover:bg-emerald-500 hover:text-black"
                            >
                              Short Call
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Strategy Builder + Calculator */}
            <div className="xl:col-span-5 space-y-6">
              <div>
                <div className="uppercase text-xs tracking-[2px] text-zinc-400 mb-3 px-1">SHORT OPTIONS STRATEGY</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {STRATEGIES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSelectedStrategy(s.key)}
                      className={`strategy-btn ${selectedStrategy === s.key ? "active" : ""}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-zinc-400 mb-3 px-1">{STRATEGIES.find(s => s.key === selectedStrategy)?.description}</div>

                {/* Leg selector */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5">Short Strike</label>
                    <select 
                      value={shortStrike} 
                      onChange={(e) => setShortStrike(Number(e.target.value))} 
                      className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-4 py-2.5"
                    >
                      {chain.map(s => <option key={s.strike} value={s.strike}>{s.strike}</option>)}
                    </select>
                  </div>

                  {(selectedStrategy.includes("spread") || selectedStrategy.includes("condor")) && (
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1.5">Long Strike (protection)</label>
                      <select 
                        value={longStrike} 
                        onChange={(e) => setLongStrike(Number(e.target.value))} 
                        className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-4 py-2.5"
                      >
                        {chain.map(s => <option key={s.strike} value={s.strike}>{s.strike}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5">Contracts</label>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="bg-zinc-900 border border-white/10 w-28 rounded-2xl px-4 py-2.5" 
                  />
                </div>
              </div>

              {/* Risk Calculator */}
              {currentCalc && (
                <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                  <div className="uppercase tracking-[2px] text-xs text-zinc-400 mb-4">LIVE RISK &amp; P/L</div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
                    <div>
                      <div className="text-zinc-400 text-xs">Total Credit Received</div>
                      <div className="text-3xl font-semibold text-[var(--accent)] mt-0.5 number">${currentCalc.totalCredit}</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 text-xs">Max Profit</div>
                      <div className="text-3xl font-semibold text-[var(--accent)] mt-0.5 number">${currentCalc.maxProfit}</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 text-xs">Max Loss</div>
                      <div className="text-2xl font-semibold text-red-500 number">${currentCalc.maxLoss}</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 text-xs">Breakeven(s)</div>
                      <div className="text-xl font-medium mt-1">{currentCalc.breakeven}</div>
                    </div>
                  </div>

                  <div className="text-[10px] mt-5 text-zinc-400 border-t border-white/10 pt-3">
                    {currentCalc.description} • ROI on risk: <span className="text-emerald-400">{currentCalc.roiOnRisk}</span>
                  </div>

                  <button 
                    onClick={openOrderPreview}
                    className="trade-button w-full mt-5"
                  >
                    PREVIEW &amp; SUBMIT ORDER TO TASTYTRADE
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Open Short Positions */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="uppercase tracking-[2px] text-xs text-zinc-400">OPEN SHORT OPTIONS POSITIONS</div>
              <div className="text-xs text-emerald-400">Paper account • Real-time P/L simulated</div>
            </div>

            <div className="rounded-3xl border border-white/10 overflow-hidden">
              <table className="trading-table w-full">
                <thead>
                  <tr>
                    <th className="pl-6 text-left">Symbol / Strategy</th>
                    <th>Strikes</th>
                    <th>Qty</th>
                    <th>Credit Received</th>
                    <th>Current Value</th>
                    <th>Unrealized P/L</th>
                    <th className="pr-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 && (
                    <tr><td colSpan={7} className="pl-6 py-8 text-zinc-400 text-sm">No open short option positions. Build a trade above.</td></tr>
                  )}
                  {positions.map((pos) => (
                    <tr key={pos.id}>
                      <td className="pl-6 font-medium">{pos.symbol} — {pos.strategy}</td>
                      <td className="font-mono">{pos.strikes}</td>
                      <td>{pos.qty}</td>
                      <td className="text-emerald-400">${pos.credit}</td>
                      <td>${pos.currentValue}</td>
                      <td className={pos.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-500"}>${pos.unrealizedPnl}</td>
                      <td className="pr-6 text-right">
                        <button 
                          onClick={() => closePosition(pos.id)} 
                          className="text-xs border border-white/10 hover:bg-zinc-800 px-3 py-1 rounded-xl"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tastytrade API Integration Notes */}
          <div className="rounded-3xl border border-white/10 p-6 text-xs text-zinc-400">
            <div className="font-medium text-white mb-2">Tastytrade API Integration (Production Ready Skeleton)</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Login is proxied through <code>app/api/tastytrade/login/route.ts</code> (add real fetch to <code>https://api.tastytrade.com/sessions</code>).</li>
              <li>Use the returned session token for subsequent calls (positions, chains, orders).</li>
              <li>Recommended: Store token in httpOnly cookie. Use paper trading accounts for development.</li>
              <li>Endpoints you will call: <code>/positions</code>, <code>/market-data/option-chains</code>, <code>/orders</code>.</li>
            </ul>
            <div className="mt-3 text-[10px]">
              Current app is fully functional in <strong>demo mode</strong> with realistic data. Replace mock chain/positions with live Tastytrade responses.
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {showOrderModal && currentCalc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-[100] p-6">
          <div className="bg-zinc-900 rounded-3xl max-w-lg w-full border border-white/10 overflow-hidden">
            <div className="px-7 pt-7 pb-5">
              <div className="uppercase text-xs tracking-[2px] mb-1 text-emerald-400">ORDER PREVIEW — TASTYTRADE</div>
              <div className="text-2xl font-semibold tracking-tighter mb-5">{currentCalc.description}</div>

              <div className="space-y-3 text-sm mb-7">
                <div className="flex justify-between"><span>Total Credit</span> <span className="font-mono text-emerald-400">${currentCalc.totalCredit}</span></div>
                <div className="flex justify-between"><span>Max Profit</span> <span className="font-mono">${currentCalc.maxProfit}</span></div>
                <div className="flex justify-between text-red-400"><span>Max Loss</span> <span className="font-mono">${currentCalc.maxLoss}</span></div>
                <div className="flex justify-between"><span>Breakeven</span> <span>{currentCalc.breakeven}</span></div>
              </div>

              <div className="text-xs text-zinc-400 mb-3">This will be sent as a Sell-to-Open order (or multi-leg) using your Tastytrade session token.</div>
            </div>

            <div className="border-t border-white/10 px-7 py-5 flex gap-3 bg-black/30">
              <button 
                onClick={() => setShowOrderModal(false)} 
                className="flex-1 py-3 rounded-2xl border border-white/20 text-sm hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button 
                onClick={submitOrder} 
                className="flex-1 trade-button"
              >
                CONFIRM &amp; SEND TO TASTYTRADE
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-[10px] text-zinc-500 py-8 border-t border-white/10">
        TradeEase • For demonstration and educational purposes only • Not financial advice • Use paper accounts
      </footer>
    </div>
  );
}

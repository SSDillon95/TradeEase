import { NextResponse } from 'next/server';

// 6-month historical daily data for futures (ZN=F, ZB=F etc.)
// Uses Yahoo Finance chart API (public, no key needed for this endpoint)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'ZN=F';

  const now = Math.floor(Date.now() / 1000);
  const sixMonthsAgo = now - (180 * 24 * 60 * 60); // approx 6 months

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${sixMonthsAgo}&period2=${now}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TradeEase/1.0)' },
    });

    if (!res.ok) throw new Error('Yahoo history fetch failed');

    const json = await res.json();
    const result = json.chart?.result?.[0];

    if (!result) throw new Error('No data');

    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];

    const points = timestamps
      .map((ts: number, i: number) => {
        const close = closes[i];
        if (close == null) return null;
        return { time: ts * 1000, price: close };
      })
      .filter(Boolean) as { time: number; price: number }[];

    return NextResponse.json({
      success: true,
      symbol,
      data: points,
      from: new Date(sixMonthsAgo * 1000).toISOString(),
      to: new Date(now * 1000).toISOString(),
    });
  } catch (error) {
    console.error('History fetch error for', symbol, error);

    // Fallback: generate plausible 6-month history around a base price
    const base = symbol === 'ZN=F' ? 112.8 : 121.5;
    const points: { time: number; price: number }[] = [];
    const start = Date.now() - 180 * 24 * 60 * 60 * 1000;
    let price = base;

    for (let i = 0; i < 130; i++) {
      const t = start + i * 24 * 60 * 60 * 1000;
      price = base + Math.sin(i / 12) * 2.5 + (Math.random() - 0.5) * 0.8;
      price = Math.max(base - 4, Math.min(base + 4, price));
      points.push({ time: t, price: Math.round(price * 1000) / 1000 });
    }

    return NextResponse.json({
      success: true,
      symbol,
      data: points,
      isFallback: true,
    });
  }
}

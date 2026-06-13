import { NextResponse } from 'next/server';

// Proxy to Yahoo Finance for live futures prices (ZB=F = 30Y, ZN=F = 10Y)
// This avoids CORS issues and keeps API calls server-side.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols') || 'ZB=F,ZN=F';

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
    
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TradeEase/1.0)',
      },
      // Add cache control for freshness
      next: { revalidate: 10 }, // Revalidate every 10s at most
    });

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Simplify the response for the frontend
    const quotes = data.quoteResponse?.result || [];
    
    const simplified = quotes.map((q: any) => ({
      symbol: q.symbol,
      shortName: q.shortName,
      regularMarketPrice: q.regularMarketPrice,
      regularMarketChange: q.regularMarketChange,
      regularMarketChangePercent: q.regularMarketChangePercent,
      regularMarketDayHigh: q.regularMarketDayHigh,
      regularMarketDayLow: q.regularMarketDayLow,
      regularMarketPreviousClose: q.regularMarketPreviousClose,
      currency: q.currency || 'USD',
      marketState: q.marketState,
      timestamp: Date.now(),
    }));

    return NextResponse.json({
      success: true,
      data: simplified,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Market quote error:', error);
    
    // Fallback to realistic mock data if Yahoo fails (common in some environments)
    const fallback = [
      {
        symbol: 'ZB=F',
        shortName: '30-Year Treasury Bond Futures',
        regularMarketPrice: 121.25 + (Math.random() - 0.5) * 0.4,
        regularMarketChange: (Math.random() - 0.5) * 0.3,
        regularMarketChangePercent: (Math.random() - 0.5) * 0.25,
        regularMarketDayHigh: 121.8,
        regularMarketDayLow: 120.9,
        regularMarketPreviousClose: 121.1,
        currency: 'USD',
        marketState: 'REGULAR',
        timestamp: Date.now(),
      },
      {
        symbol: 'ZN=F',
        shortName: '10-Year Treasury Note Futures',
        regularMarketPrice: 112.85 + (Math.random() - 0.5) * 0.3,
        regularMarketChange: (Math.random() - 0.5) * 0.2,
        regularMarketChangePercent: (Math.random() - 0.5) * 0.18,
        regularMarketDayHigh: 113.1,
        regularMarketDayLow: 112.6,
        regularMarketPreviousClose: 112.7,
        currency: 'USD',
        marketState: 'REGULAR',
        timestamp: Date.now(),
      },
    ];

    return NextResponse.json({
      success: true,
      data: fallback,
      timestamp: Date.now(),
      isFallback: true,
    });
  }
}

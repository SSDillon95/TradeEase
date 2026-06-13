"use client";

import { useState } from "react";

export default function MyWebApp() {
  const [count, setCount] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black dark:bg-white flex items-center justify-center">
              <span className="text-white dark:text-black font-bold text-xl tracking-[-2px]">W</span>
            </div>
            <span className="font-semibold text-xl tracking-tight">My Web App</span>
          </div>
          <nav className="flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="hover:text-black/70 dark:hover:text-white/70 transition-colors">Features</a>
            <a href="#demo" className="hover:text-black/70 dark:hover:text-white/70 transition-colors">Demo</a>
            <a href="https://github.com" target="_blank" className="hover:text-black/70 dark:hover:text-white/70 transition-colors">GitHub</a>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-semibold tracking-widest hover:opacity-90 transition"
            >
              RELOAD
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 px-4 py-1 text-xs font-medium tracking-[2px] mb-6">
          NEXT.JS 16 • TYPE SCRIPT • TAILWIND
        </div>
        
        <h1 className="text-6xl sm:text-7xl font-semibold tracking-tighter leading-none mb-6">
          Your web app.<br />Connected.
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-10">
          A modern full-stack ready starter. GitHub version controlled. One-click deploy to free hosting.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="#demo" 
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-black px-8 text-white font-semibold dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Try the demo ↓
          </a>
          <a 
            href="https://vercel.com/new" 
            target="_blank"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-black/15 dark:border-white/20 px-8 font-semibold hover:bg-white dark:hover:bg-zinc-900 transition-colors"
          >
            Deploy to Vercel
          </a>
        </div>
        <p className="text-xs text-zinc-500 mt-4">Free tier • Instant previews • Custom domains supported</p>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-6">
        {[
          { title: "Next.js 16 + React 19", desc: "App router, server components, fast refresh, and modern React." },
          { title: "GitHub Connected", desc: "Full source on GitHub. Every push can trigger deploys and previews." },
          { title: "Free Hosting Ready", desc: "Designed for Vercel (or Netlify). Zero-config continuous deployment." },
        ].map((f, i) => (
          <div key={i} className="rounded-3xl border border-black/10 dark:border-white/10 p-8 bg-white dark:bg-zinc-900">
            <div className="font-semibold text-xl mb-3">{f.title}</div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Interactive Demo */}
      <section id="demo" className="max-w-5xl mx-auto px-6 pb-20">
        <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-10 md:p-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="uppercase tracking-[3px] text-xs font-semibold text-zinc-500 mb-1">INTERACTIVE DEMO</div>
              <h3 className="text-4xl font-semibold tracking-tighter">Live React counter</h3>
            </div>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-sm px-5 py-2 rounded-full border border-black/10 dark:border-white/15 hover:bg-zinc-100 dark:hover:bg-zinc-950 transition"
            >
              {showInfo ? "Hide" : "How it works"}
            </button>
          </div>

          <div className="flex flex-col items-center py-10">
            <div className="text-[120px] font-mono tabular-nums font-semibold tracking-[-8px] leading-none mb-2 text-black dark:text-white">
              {count}
            </div>
            <p className="text-zinc-500 mb-8">Clicks so far</p>

            <div className="flex gap-3">
              <button 
                onClick={() => setCount(c => c + 1)}
                className="px-8 h-12 rounded-2xl bg-black text-white font-medium active:scale-[0.985] transition dark:bg-white dark:text-black"
              >
                Increment
              </button>
              <button 
                onClick={() => setCount(0)}
                className="px-8 h-12 rounded-2xl border border-black/10 dark:border-white/15 font-medium hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800 transition"
              >
                Reset
              </button>
            </div>
          </div>

          {showInfo && (
            <div className="mt-6 rounded-2xl bg-zinc-100 dark:bg-zinc-950 p-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 border border-black/5 dark:border-white/5">
              This counter uses React <code className="font-mono bg-white dark:bg-black px-1.5 py-px rounded">useState</code>. 
              It&apos;s fully client-side (marked &quot;use client&quot;). Edit <code className="font-mono">app/page.tsx</code> to customize further. 
              Changes hot-reload when you run <code className="font-mono">npm run dev</code>.
            </div>
          )}
        </div>
      </section>

      {/* Stack + Next Steps */}
      <section className="border-t border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div className="max-w-5xl mx-auto px-6 py-14 text-sm grid md:grid-cols-2 gap-x-12 gap-y-10">
          <div>
            <div className="font-semibold mb-3 text-base">Current stack</div>
            <ul className="space-y-1.5 text-zinc-600 dark:text-zinc-400">
              <li>Next.js 16 (App Router)</li>
              <li>TypeScript + ESLint</li>
              <li>Tailwind CSS v4</li>
              <li>React 19 + Server Components</li>
              <li>Ready for API routes, server actions, and databases</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3 text-base">Next steps</div>
            <ol className="list-decimal list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
              <li>Run <span className="font-mono bg-zinc-100 dark:bg-zinc-900 px-1.5 py-px rounded">npm run dev</span> locally</li>
              <li>Edit this page in <span className="font-mono">app/page.tsx</span></li>
              <li>Commit &amp; push to GitHub (auto deploys!)</li>
              <li>Connect repo to Vercel or Netlify for free hosting</li>
            </ol>
            <p className="mt-4 text-xs text-zinc-500">Pro tip: Vercel gives you a production URL + preview URLs for every branch/PR.</p>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-zinc-400 border-t border-black/10 dark:border-white/10">
        Built with ❤️ using Next.js • Source on GitHub • Deploy anywhere
      </footer>
    </div>
  );
}

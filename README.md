# My Web App

A modern, production-ready web app built with Next.js 16.

**Stack:** Next.js (App Router) • TypeScript • Tailwind CSS • ESLint • React 19

**Connected to:** GitHub (version control + CI)  
**Free hosting:** Vercel (recommended) or Netlify — zero-config GitHub deploys

## Quick start (local development)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Edit `app/page.tsx` (or any file in `app/`) — changes hot reload instantly.

## Key features of this starter

- Clean, responsive UI with dark mode support
- Interactive React demo (client component with useState)
- Ready for API routes, Server Actions, databases, auth, etc.
- Professional layout + metadata

## GitHub + Free Hosting workflow (what you asked for)

1. Code lives here in this repo on GitHub.
2. Push to `main` (or any branch).
3. Connect the GitHub repo to Vercel (or Netlify):
   - Go to https://vercel.com/new
   - Sign in with GitHub
   - Import this repository
   - Deploy (takes ~30 seconds first time)
4. Every future push = new production deploy + preview URLs for branches.

Alternative hosts with great GitHub integration:
- Netlify (https://app.netlify.com/start)
- Render, Railway, etc. for backend-heavy needs

## Useful scripts

| Command         | Description                  |
|-----------------|------------------------------|
| `npm run dev`   | Start local dev server       |
| `npm run build` | Production build             |
| `npm run start` | Run the production build     |
| `npm run lint`  | Run ESLint                   |

## Next ideas to build on this

- Add authentication (NextAuth, Clerk, Supabase Auth)
- Connect a database (Vercel Postgres, Supabase, PlanetScale)
- Add API routes in `app/api/`
- Deploy previews via Vercel + GitHub PRs (built-in)

Created with `create-next-app`, then customized + wired for GitHub + free hosting.

import { NextResponse } from "next/server";

// Tastytrade API Login Proxy
// Documentation: https://developer.tastytrade.com/ (or their official docs)
// 
// Real flow:
// 1. POST https://api.tastytrade.com/sessions
//    Body: { "login": "...", "password": "...", "remember-me": true }
// 2. Response contains session-token
// 3. Use "Authorization: Bearer <token>" for all subsequent requests
//
// IMPORTANT SECURITY:
// - This route acts as a proxy so credentials never touch the browser.
// - In production: Store the token in an httpOnly secure cookie.
// - Rate limit this endpoint heavily.
// - Only allow paper trading accounts in development.
// - Never log passwords.

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // === DEMO / DEVELOPMENT MODE ===
    // Return a fake successful response so the UI works without real credentials.
    // Replace the block below with real API call when ready.
    if (process.env.NODE_ENV !== "production" || process.env.ENABLE_TASTYTRADE_LIVE === "true") {
      // Simulate network + validation
      await new Promise((r) => setTimeout(r, 420));

      // In real life you would do:
      /*
      const res = await fetch("https://api.tastytrade.com/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login,
          password,
          "remember-me": true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.data?.["session-token"]) {
        return NextResponse.json({ error: "Tastytrade login failed" }, { status: 401 });
      }

      const token = data.data["session-token"];

      // Store token securely (example: set httpOnly cookie)
      // const response = NextResponse.json({ success: true, account: data.data });
      // response.cookies.set("tasty_session", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 60 * 60 * 8 });
      // return response;
      */

      return NextResponse.json({
        success: true,
        message: "DEMO MODE: Logged in successfully (replace with real Tastytrade /sessions call)",
        sessionToken: "demo-token-" + Date.now(),
        accounts: [
          { account_number: "PAPER12345", account_type: "paper" },
          { account_number: "LIVE98765", account_type: "live" },
        ],
      });
    }

    // Production path (uncomment and harden when ready)
    return NextResponse.json(
      { error: "Live Tastytrade connection not enabled in this environment" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Tastytrade login proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

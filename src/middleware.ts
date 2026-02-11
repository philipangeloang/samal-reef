import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get country from request headers
  // Vercel provides x-vercel-ip-country header
  // Cloudflare provides cf-ipcountry header
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry");

  // Block Honduras (country code: HN) - return 404 to not reveal blocking
  if (country === "HN") {
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>404: This page could not be found</title>
  <style>
    body {
      color: #000;
      background: #fff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      height: 100vh;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
    .next-error-h1 {
      display: inline-block;
      margin: 0 20px 0 0;
      padding-right: 23px;
      font-size: 24px;
      font-weight: 500;
      vertical-align: top;
      line-height: 49px;
      border-right: 1px solid rgba(0, 0, 0, 0.3);
    }
    .next-error-h2 {
      font-size: 14px;
      font-weight: 400;
      line-height: 49px;
      margin: 0;
      display: inline-block;
    }
    @media (prefers-color-scheme: dark) {
      body {
        color: #fff;
        background: #000;
      }
      .next-error-h1 {
        border-right: 1px solid rgba(255, 255, 255, 0.3);
      }
    }
  </style>
</head>
<body>
  <div>
    <h1 class="next-error-h1">404</h1>
    <div class="next-error-h2">
      <h2>This page could not be found.</h2>
    </div>
  </div>
</body>
</html>`,
      {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      },
    );
  }

  return NextResponse.next();
}

// Apply middleware to all routes except:
// - API routes
// - Next.js static files (_next/static)
// - Next.js image optimization (_next/image)
// - Favicon and other static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

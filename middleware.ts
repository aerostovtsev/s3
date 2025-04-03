import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const rateLimitConfigs: Record<string, { interval: number; limit: number }> = {
  "/api/upload": { interval: 60, limit: 60 },
  "/api/files": { interval: 60, limit: 100 },
  "/api/auth": { interval: 60, limit: 30 },
  "/api/auth/send-token": { interval: 60, limit: 30 },
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const config = rateLimitConfigs[pathname];

  if (config) {
    try {
      const identifier =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "anonymous";

      const rateLimitResponse = await fetch(
        `${request.nextUrl.origin}/api/rate-limit?identifier=${identifier}&path=${pathname}`,
        {
          headers: {
            "x-forwarded-for": identifier,
            "x-real-ip": identifier,
          },
        }
      );

      if (!rateLimitResponse.ok) {
        const data = await rateLimitResponse.json();
        return new NextResponse(JSON.stringify(data), {
          status: 429,
          headers: {
            ...rateLimitResponse.headers,
            "Content-Type": "application/json",
            "Retry-After": config.interval.toString(),
          },
        });
      }
    } catch (error) {
      console.error("Rate limit check failed:", error);
      return new NextResponse(
        JSON.stringify({
          error: "Rate limit check failed",
          message: "Please try again later",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": config.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": config.interval.toString(),
          },
        }
      );
    }
  }

  const token = await getToken({ req: request });

  const isAuthenticated = !!token;
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register");

  if (isAdminRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (isAuthRoute) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (request.nextUrl.pathname.startsWith("/dashboard") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (request.nextUrl.pathname === "/" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

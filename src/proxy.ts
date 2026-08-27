import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Use the auth wrapper from next-auth which attaches the session to the request
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");
  const isPublicRoute = req.nextUrl.pathname === "/";

  // If the user is trying to access an auth route (like login)
  if (isAuthRoute) {
    if (isLoggedIn) {
      // Redirect to dashboard if already logged in
      return Response.redirect(new URL("/dashboard", req.nextUrl));
    }
    return null;
  }

  // If the user is not logged in and it's not a public route
  if (!isLoggedIn && !isPublicRoute) {
    // Redirect unauthenticated users to login page
    return Response.redirect(new URL("/auth/login", req.nextUrl));
  }

  // Inject Correlation ID and Request Metadata
  const correlationId = req.headers.get("x-correlation-id") || crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-correlation-id", correlationId);
  requestHeaders.set("x-request-method", req.method);
  requestHeaders.set("x-request-url", req.nextUrl.pathname);
  requestHeaders.set("x-request-start", Date.now().toString());

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-correlation-id", correlationId);

  return response;
});

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

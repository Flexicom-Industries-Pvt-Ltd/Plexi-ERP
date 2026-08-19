import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  // Extract or generate correlation ID
  const correlationId = req.headers.get("x-correlation-id") || crypto.randomUUID();
  
  // Create a new headers object based on the original request headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-correlation-id", correlationId);

  // Return a new response to allow passing headers to downstream handlers
  const response = NextResponse.next({
    request: {
      // Apply the modified headers
      headers: requestHeaders,
    },
  });

  // Also expose the correlation ID in the response headers for client tracking
  response.headers.set("x-correlation-id", correlationId);

  return response;
});

// Define which routes the middleware should run on
export const config = {
  matcher: [
    // Match all API routes and app routes except static files and images
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};

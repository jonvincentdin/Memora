import { NextResponse } from "next/server";

/**
 * Wraps a route handler so an unexpected exception (a bad Prisma query, a
 * thrown error deep in a repo function, etc.) can never escape as Next.js's
 * default HTML error page.
 *
 * Why this matters: the client always does `await res.json()` on API
 * responses. If the server throws before sending a body, Next.js renders an
 * HTML error page instead of JSON, `res.json()` then throws on the client,
 * and every fetch call in this app reports that in its `catch` block as
 * "We couldn't reach the server" — even though the server *was* reached and
 * the request *did* fail server-side. That misleading message is what made
 * intermittent failures look like connectivity problems. Every route below
 * is wrapped with this so failures always come back as real, readable JSON
 * error messages instead.
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<NextResponse>
) {
  return async (request: Request, ...args: Args): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (err) {
      console.error("[api] unhandled error:", err);
      return NextResponse.json(
        { error: "Something went wrong on our end. Please try again in a moment." },
        { status: 500 }
      );
    }
  };
}

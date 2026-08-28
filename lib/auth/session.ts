import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authOptions } from "@/lib/auth/options";

/** Request-scoped memoization prevents the layout and page from decoding the
 * same JWT twice during one server render. */
export const getCurrentSession = cache(() => getServerSession(authOptions));

/**
 * Returns the current authenticated user, redirecting to /login when there
 * is none. Use this at the top of any server component / layout that must
 * never render for a signed-out visitor.
 */
export async function requireUser() {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}

/**
 * Returns the current authenticated user id for API route handlers, or null.
 * Route handlers should respond 401 themselves rather than redirect.
 */
export async function requireUserOrNull() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

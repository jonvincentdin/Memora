import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

// A precomputed dummy hash so a login attempt against a nonexistent email
// still runs bcrypt.compare — otherwise "no such user" responds measurably
// faster than "wrong password", which leaks which emails are registered.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8mVvNfeaVfoi9AKn1BX/EeJXP4wxwG";

/**
 * Central NextAuth configuration.
 *
 * Only a credentials (email + password) provider is enabled by default so the
 * app runs with zero external setup. To add Google sign-in, uncomment the
 * GoogleProvider block below and set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 * in your environment (see .env.example).
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        // Best-effort brute-force throttle, keyed by email so it can't be
        // bypassed by rotating IPs alone (see lib/rate-limit.ts for caveats).
        // Both operations are independent database calls. Running them in a
        // single wave avoids an extra network round trip on every login.
        const [limited, user] = await Promise.all([
          isRateLimited(`login:${normalizedEmail}`),
          prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, name: true, email: true, image: true, passwordHash: true, emailVerified: true, onboardingCompletedAt: true },
          }),
        ]);
        if (limited) {
          return null;
        }

        // Deliberately generic outcome, and always run bcrypt.compare (even
        // against a dummy hash when there's no user) so response time
        // doesn't reveal whether the email is registered.
        const passwordValid = await bcrypt.compare(credentials.password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !passwordValid || !user.emailVerified) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? undefined,
          onboardingCompletedAt: user.onboardingCompletedAt,
        };
      },
    }),

    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await prisma.activeSession.deleteMany({ where: { OR: [{ lastSeenAt: { lt: cutoff } }, { userId: user.id, id: token.sessionId ?? "" }] } });
        const existing = await prisma.activeSession.count({ where: { userId: user.id, lastSeenAt: { gte: cutoff } } });
        token.sessionId = randomUUID();
        // A newly registered account can trigger more than one auth callback
        // while it moves through onboarding. Never treat that first session as
        // a conflict; conflict handling starts with subsequent logins.
        token.sessionConflict = Boolean(user.onboardingCompletedAt) && existing > 0;
        token.lastSessionCheck = Date.now();
        await prisma.activeSession.create({ data: { id: token.sessionId, userId: user.id } });
      } else if (token.sessionId && (!token.lastSessionCheck || Date.now() - token.lastSessionCheck > 30_000)) {
        const active = await prisma.activeSession.findUnique({ where: { id: token.sessionId }, select: { id: true } });
        token.invalidated = !active;
        token.lastSessionCheck = Date.now();
        if (active) await prisma.activeSession.update({ where: { id: token.sessionId }, data: { lastSeenAt: new Date() } });
      }
      return token;
    },
    async session({ session, token }) {
      if (token.invalidated) {
        (session as { user?: unknown }).user = undefined;
        return session;
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.sessionId = token.sessionId;
        session.user.sessionConflict = token.sessionConflict;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.sessionId) await prisma.activeSession.deleteMany({ where: { id: token.sessionId } });
    },
  },
  secret: process.env.AUTH_SECRET,
};

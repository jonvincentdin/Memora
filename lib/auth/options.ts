import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";

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
        if (await isRateLimited(`login:${normalizedEmail}`)) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        // Deliberately generic outcome, and always run bcrypt.compare (even
        // against a dummy hash when there's no user) so response time
        // doesn't reveal whether the email is registered.
        const passwordValid = await bcrypt.compare(credentials.password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !passwordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? undefined,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};

import "next-auth";

declare module "next-auth" {
  interface User {
    onboardingCompletedAt?: Date | null;
    keepLoggedIn?: boolean;
    userAgent?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      sessionId?: string;
      sessionConflict?: boolean;
      sessionConflictDevice?: string;
      currentSessionDevice?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    sessionId?: string;
    sessionConflict?: boolean;
    sessionConflictDevice?: string;
    currentSessionDevice?: string;
    invalidated?: boolean;
    lastSessionCheck?: number;
    keepLoggedIn?: boolean;
    sessionExpiresAt?: number;
  }
}

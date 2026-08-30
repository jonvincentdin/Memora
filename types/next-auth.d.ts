import "next-auth";

declare module "next-auth" {
  interface User {
    onboardingCompletedAt?: Date | null;
    keepLoggedIn?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      sessionId?: string;
      sessionConflict?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    sessionId?: string;
    sessionConflict?: boolean;
    invalidated?: boolean;
    lastSessionCheck?: number;
    keepLoggedIn?: boolean;
    sessionExpiresAt?: number;
  }
}

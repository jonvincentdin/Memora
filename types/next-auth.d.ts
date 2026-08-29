import "next-auth";

declare module "next-auth" {
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
  }
}

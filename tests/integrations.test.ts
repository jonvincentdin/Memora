import { beforeEach, describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/lib/integrations/crypto";
import { createOAuthState, verifyOAuthState } from "@/lib/integrations/oauth-state";

describe("integration credentials", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "unit-test-auth-secret-with-enough-entropy";
    process.env.INTEGRATION_ENCRYPTION_KEY = "unit-test-encryption-secret";
  });

  it("encrypts tokens with a random authenticated payload", () => {
    const first = encryptToken("sensitive-token");
    const second = encryptToken("sensitive-token");
    expect(first.equals(second)).toBe(false);
    expect(decryptToken(first)).toBe("sensitive-token");
  });

  it("binds OAuth state to both user and provider", () => {
    const state = createOAuthState("user-1", "google");
    expect(verifyOAuthState(state, "user-1", "google")).toBe(true);
    expect(verifyOAuthState(state, "user-2", "google")).toBe(false);
    expect(verifyOAuthState(state, "user-1", "notion")).toBe(false);
    expect(verifyOAuthState(`${state}changed`, "user-1", "google")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { describeUserAgent } from "@/lib/auth/user-agent";

describe("session device descriptions", () => {
  it("identifies Chrome on Windows", () => {
    expect(describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36")).toBe("Chrome on Windows");
  });

  it("identifies Safari on iPhone", () => {
    expect(describeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari on iPhone");
  });

  it("uses a safe fallback when device details are unavailable", () => {
    expect(describeUserAgent()).toBe("an unknown device");
  });
});

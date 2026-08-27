import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey(): Buffer {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Missing INTEGRATION_ENCRYPTION_KEY or AUTH_SECRET.");
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(value: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

export function decryptToken(value: Uint8Array): string {
  const buffer = Buffer.from(value);
  if (buffer.length < 29) throw new Error("Invalid encrypted integration token.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), buffer.subarray(0, 12));
  decipher.setAuthTag(buffer.subarray(12, 28));
  return Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString("utf8");
}

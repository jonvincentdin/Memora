CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE', 'NOTION');

CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "accessToken" BYTEA NOT NULL,
    "refreshToken" BYTEA,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "integration_connections_userId_idx" ON "integration_connections"("userId");
CREATE UNIQUE INDEX "integration_connections_userId_provider_key" ON "integration_connections"("userId", "provider");

ALTER TABLE "integration_connections"
ADD CONSTRAINT "integration_connections_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

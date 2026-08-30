CREATE TABLE "public_resource_links" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_resource_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "public_resource_links_token_key" ON "public_resource_links"("token");
CREATE UNIQUE INDEX "public_resource_links_resourceId_resourceType_key" ON "public_resource_links"("resourceId", "resourceType");
CREATE INDEX "public_resource_links_ownerId_idx" ON "public_resource_links"("ownerId");

ALTER TABLE "public_resource_links"
ADD CONSTRAINT "public_resource_links_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

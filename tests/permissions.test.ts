import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  note: { findUnique: vi.fn() },
  reviewer: { findUnique: vi.fn() },
  quiz: { findUnique: vi.fn() },
  resourceShare: { findUnique: vi.fn(), deleteMany: vi.fn() },
  shareCollectionItem: { deleteMany: vi.fn() },
  shareFeedback: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import { revokeShare } from "@/lib/permissions";

describe("share revocation authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.note.findUnique.mockResolvedValue({ ownerId: "owner-1" });
    db.resourceShare.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("scopes deletion to the owner and exact resource", async () => {
    await revokeShare({ ownerId: "owner-1", resourceType: "NOTE", resourceId: "note-1", shareId: "share-1" });

    expect(db.resourceShare.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "share-1",
        ownerId: "owner-1",
        resourceType: "NOTE",
        resourceId: "note-1",
      },
    });
  });

  it("rejects a share id that does not belong to that resource", async () => {
    db.resourceShare.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      revokeShare({ ownerId: "owner-1", resourceType: "NOTE", resourceId: "note-1", shareId: "other-share" })
    ).rejects.toThrow("Share not found for this resource.");
  });
});

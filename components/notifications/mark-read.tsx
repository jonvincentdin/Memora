"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MarkNotificationsRead() { const router = useRouter(); return <Button variant="outline" size="sm" onClick={async () => { await fetch("/api/notifications", { method: "PATCH" }); router.refresh(); }}>Mark all read</Button>; }

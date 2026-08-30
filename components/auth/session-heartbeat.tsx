"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 30_000;

export function SessionHeartbeat() {
  useEffect(() => {
    const heartbeat = () => {
      if (document.visibilityState === "visible") {
        void fetch("/api/sessions/heartbeat", { method: "POST" });
      }
    };

    heartbeat();
    const interval = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", heartbeat);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, []);

  return null;
}

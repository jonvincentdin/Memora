"use client";

import { useState } from "react";
import { Cloud, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";

type Provider = "google" | "notion";
export interface IntegrationStatusResponse {
  connections: Array<{ provider: Provider; metadata?: { email?: string; workspaceName?: string } | null }>;
  configured: Record<Provider, boolean>;
}

export function IntegrationConnections({ initialData }: { initialData: IntegrationStatusResponse }) {
  const [data, setData] = useState<IntegrationStatusResponse>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);

  async function load() {
    const response = await fetch("/api/integrations", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (response.ok) setData(payload);
    else setError(payload?.error ?? "Couldn't load connections.");
  }

  async function disconnect(provider: Provider) {
    setBusy(provider);
    setError(null);
    const response = await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? `Couldn't disconnect ${provider}.`);
    }
    await load();
    setBusy(null);
  }

  return (
    <section id="connections" className="card mt-5 scroll-mt-24 p-5">
      <div className="mb-3 flex items-center gap-2"><Cloud className="h-5 w-5 text-accent" /><h2 className="font-display text-xl text-ink">Connected accounts</h2></div>
      <p className="mb-4 text-sm text-ink-soft">Connect your own Drive or Notion workspace. Credentials are encrypted and available only to your Memoria account.</p>
      <div className="space-y-3">
        {(["google", "notion"] as const).map((provider) => {
          const connection = data.connections.find((item) => item.provider === provider);
          const label = provider === "google" ? "Google Drive" : "Notion";
          const detail = connection?.metadata?.email || connection?.metadata?.workspaceName;
          return (
            <div key={provider} className="flex items-center justify-between gap-4 rounded-lg border border-line p-4">
              <div><p className="text-sm font-semibold text-ink">{label}</p><p className="text-xs text-ink-soft">{connection ? detail || "Connected" : data.configured[provider] === false ? "OAuth credentials need to be configured by the deployer." : "Not connected"}</p></div>
              {connection ? <Button variant="outline" size="sm" loading={busy === provider} onClick={() => void disconnect(provider)}><Unlink className="h-3.5 w-3.5" /> Disconnect</Button> : <Button size="sm" disabled={!data.configured[provider]} onClick={() => { window.location.href = `/api/integrations/${provider}/connect`; }}><Link2 className="h-3.5 w-3.5" /> Connect</Button>}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}

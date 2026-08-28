import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings/settings-form";
import { IntegrationConnections } from "@/components/settings/integration-connections";
import { connectionStatuses } from "@/lib/integrations/repository";
import { isProviderConfigured } from "@/lib/integrations/config";

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, connections] = await Promise.all([
    prisma.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} }),
    connectionStatuses(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-soft">Account: {user.email}</p>

      <div className="mt-8">
        <SettingsForm
          initial={{
            appearance: settings.appearance,
            defaultQuestionCount: settings.defaultQuestionCount,
            defaultDifficulty: settings.defaultDifficulty,
            showExplanations: settings.showExplanations,
            autoSave: settings.autoSave,
          }}
        />
      </div>
      <IntegrationConnections
        initialData={{
          connections,
          configured: { google: isProviderConfigured("google"), notion: isProviderConfigured("notion") },
        }}
      />
    </div>
  );
}

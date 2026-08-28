import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings/settings-form";
import { IntegrationConnections } from "@/components/settings/integration-connections";

export default async function SettingsPage() {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { settings: true } });
  const settings = dbUser?.settings ?? (await prisma.userSettings.create({ data: { userId: user.id } }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-soft">Account: {dbUser?.email}</p>

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
      <IntegrationConnections />
    </div>
  );
}

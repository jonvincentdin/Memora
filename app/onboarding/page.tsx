import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { isProviderConfigured } from "@/lib/integrations/config";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const user = await requireUser();
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, onboardingCompletedAt: true } });
  if (!account) return null;
  if (account.onboardingCompletedAt) redirect("/dashboard");
  return (
    <OnboardingFlow
      initialName={account.name}
      email={account.email}
      configuredProviders={{
        google: isProviderConfigured("google"),
        notion: isProviderConfigured("notion"),
      }}
    />
  );
}

import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { SessionConflictModal } from "@/components/auth/session-conflict-modal";
import { SessionHeartbeat } from "@/components/auth/session-heartbeat";

// This layout wraps every authenticated route (dashboard, notes, reviewers,
// quizzes, study, shared, settings — see the route groups that reuse it via
// the (app) segment). requireUser() enforces auth server-side; there is no
// client-only route guard anywhere in the app.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [unreadNotifications, account] = await Promise.all([prisma.notification.count({ where: { userId: user.id, readAt: null } }), prisma.user.findUnique({ where: { id: user.id }, select: { onboardingCompletedAt: true } })]);
  if (!account?.onboardingCompletedAt) redirect("/onboarding");

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <Topbar userName={user.name ?? user.email ?? "Account"} unreadNotifications={unreadNotifications} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <MobileNav />
      <SessionHeartbeat />
      {user.sessionConflict && user.sessionId && <SessionConflictModal userName={user.name ?? user.email ?? "This account"} sessionId={user.sessionId} />}
    </div>
  );
}

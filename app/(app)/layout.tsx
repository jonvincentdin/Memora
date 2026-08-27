import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";

// This layout wraps every authenticated route (dashboard, notes, reviewers,
// quizzes, study, shared, settings — see the route groups that reuse it via
// the (app) segment). requireUser() enforces auth server-side; there is no
// client-only route guard anywhere in the app.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <Topbar userName={user.name ?? user.email ?? "Account"} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}

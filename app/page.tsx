import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Workflow } from "@/components/landing/workflow";
import { LandingFooter } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <main>
      <LandingNav />
      <Hero />
      <Features />
      <Workflow />
      <LandingFooter />
    </main>
  );
}

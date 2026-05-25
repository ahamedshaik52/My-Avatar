import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-avatar-dark overflow-x-hidden">
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingTestimonials />
      <LandingPricing />
      <LandingCTA />
      <LandingFooter />
    </main>
  );
}

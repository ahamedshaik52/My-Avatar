"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect to try My Avatar",
    features: [
      "5 videos per month",
      "1080p export quality",
      "10 built-in voices",
      "3 min max video length",
      "My Avatar watermark",
      "Community support",
    ],
    cta: "Start free",
    href: "/signup",
    variant: "outline" as const,
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For serious content creators",
    features: [
      "Unlimited videos",
      "4K export quality",
      "50+ voices + voice cloning",
      "Unlimited video length",
      "No watermark",
      "Priority processing",
      "Advanced lip sync",
      "Priority support",
    ],
    cta: "Start Pro",
    href: "/signup?plan=pro",
    variant: "gradient" as const,
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For teams and organisations",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "Custom avatar training",
      "API access",
      "SSO / SAML",
      "SLA guarantee",
      "Dedicated CSM",
      "Custom integrations",
    ],
    cta: "Contact sales",
    href: "/contact",
    variant: "outline" as const,
    highlight: false,
  },
];

export function LandingPricing() {
  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-avatar-purple/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 text-sm font-medium mb-4">
            <Zap size={14} />
            Simple pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Pay for what you use,{" "}
            <span className="gradient-text">not more</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            No hidden fees, no surprise charges. Cancel any time.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.highlight
                  ? "bg-gradient-to-b from-avatar-purple/20 to-avatar-dark-card border-2 border-avatar-purple/50 glow-purple"
                  : "glass-card border border-avatar-dark-border"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-avatar-purple to-avatar-cyan text-white text-xs font-bold">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-sm">
                    <Check size={16} className="text-green-400 shrink-0" />
                    <span className="text-muted-foreground">{feat}</span>
                  </li>
                ))}
              </ul>

              <Button variant={plan.variant} size="lg" className="w-full" asChild>
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

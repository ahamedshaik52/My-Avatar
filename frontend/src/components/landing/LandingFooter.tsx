import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Github, Twitter, Linkedin } from "lucide-react";

const links = {
  Product: ["Features", "Pricing", "Changelog", "Roadmap"],
  Company: ["About", "Blog", "Careers", "Press"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
  Support: ["Documentation", "API Docs", "Status", "Contact"],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-avatar-dark-border py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Logo size="sm" className="mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-xs">
              The AI-powered platform for creating professional avatar videos at scale.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Github, href: "#" },
                { Icon: Twitter, href: "#" },
                { Icon: Linkedin, href: "#" },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-8 h-8 rounded-lg bg-avatar-dark-card border border-avatar-dark-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-avatar-purple/50 transition-colors"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-avatar-dark-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} My Avatar. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with ♥ for creators everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}

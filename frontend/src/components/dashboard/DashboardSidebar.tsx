"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, PlusCircle, FolderOpen, Settings,
  ChevronLeft, ChevronRight, HelpCircle, Zap,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Create Video", href: "/create", icon: PlusCircle },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((s) => s.user);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="hidden md:flex flex-col bg-avatar-dark-card border-r border-avatar-dark-border relative shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-avatar-dark-border shrink-0">
        {collapsed ? <Logo size="sm" showText={false} /> : <Logo size="sm" />}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                active
                  ? "bg-avatar-purple/20 text-avatar-purple-light border border-avatar-purple/25"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon size={18} className={cn("shrink-0", active ? "text-avatar-purple-light" : "")} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Upgrade banner */}
      <AnimatePresence>
        {!collapsed && user?.plan === "free" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-3 mb-3 p-4 rounded-xl bg-gradient-to-br from-avatar-purple/20 to-avatar-cyan/10 border border-avatar-purple/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-xs font-semibold text-foreground">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Unlock 4K, unlimited videos & voice cloning.</p>
            <Link
              href="/settings?tab=billing"
              className="block w-full text-center text-xs py-2 px-3 rounded-lg bg-gradient-to-r from-avatar-purple to-avatar-cyan text-white font-medium hover:opacity-90 transition-opacity"
            >
              Upgrade now
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help */}
      <div className="p-3 border-t border-avatar-dark-border">
        <button className={cn("flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all")}>
          <HelpCircle size={18} className="shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Help & Support
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3.5 top-20 w-7 h-7 rounded-full bg-avatar-dark-card border border-avatar-dark-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-avatar-purple/50 transition-colors z-10"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </motion.aside>
  );
}

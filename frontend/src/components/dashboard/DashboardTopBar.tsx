"use client";
import { useRouter } from "next/navigation";
import { Bell, LogOut, User, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { useAuthStore } from "@/lib/store";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";

export function DashboardTopBar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Cookies.remove("access_token");
    logout();
    toast.success("Signed out successfully");
    router.push("/");
  };

  return (
    <header className="h-16 border-b border-avatar-dark-border bg-avatar-dark-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
      {/* Mobile logo */}
      <div className="md:hidden">
        <Logo size="sm" />
      </div>

      {/* Search placeholder */}
      <div className="hidden md:flex flex-1 max-w-sm">
        <div className="w-full h-9 rounded-lg border border-avatar-dark-border bg-avatar-dark px-3 text-sm text-muted-foreground flex items-center cursor-text hover:border-avatar-purple/30 transition-colors">
          Search projects...
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 rounded-lg border border-avatar-dark-border bg-avatar-dark flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-avatar-purple/30 transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-avatar-purple" />
        </button>

        {/* User menu */}
        <div className="relative group">
          <button className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border border-avatar-dark-border bg-avatar-dark hover:border-avatar-purple/30 transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-avatar-purple to-avatar-cyan flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block max-w-[120px] truncate">
              {user?.name ?? "User"}
            </span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-avatar-dark-border bg-avatar-dark-card shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="p-3 border-b border-avatar-dark-border">
              <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-avatar-purple/20 text-avatar-purple-light capitalize">
                {user?.plan ?? "free"} plan
              </span>
            </div>
            <div className="p-1">
              <button
                onClick={() => router.push("/settings")}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                <User size={14} />
                Profile settings
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

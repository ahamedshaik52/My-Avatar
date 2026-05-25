"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { useAuthStore } from "@/lib/store";
import { authApi } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser, isAuthenticated } = useAuthStore();

  // Middleware already blocks unauthenticated access server-side.
  // This effect only hydrates the user store from the API after SSR.
  useEffect(() => {
    if (!isAuthenticated) {
      authApi.me().then(setUser).catch(() => {
        // Token present but invalid/expired — clear and redirect
        Cookies.remove("access_token");
        router.replace("/login");
      });
    }
  }, [isAuthenticated, router, setUser]);

  return (
    <div className="min-h-screen bg-avatar-dark flex">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopBar />
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

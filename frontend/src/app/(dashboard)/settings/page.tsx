"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { User, CreditCard, Bell, Shield, Loader2, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
});
type ProfileForm = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "" },
  });

  const onSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Profile updated successfully");
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Tab list */}
        <nav className="flex sm:flex-col gap-1 sm:w-44 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                activeTab === id
                  ? "bg-avatar-purple/20 text-avatar-purple-light border border-avatar-purple/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground">Profile information</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-avatar-purple to-avatar-cyan flex items-center justify-center text-2xl font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <Button variant="outline" size="sm">Change photo</Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Max 2MB</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSave)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Full name</label>
                  <Input {...register("name")} />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Email address</label>
                  <Input type="email" {...register("email")} />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                </div>
                <Button variant="gradient" type="submit" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Check size={16} className="mr-2" />}
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </motion.div>
          )}

          {activeTab === "billing" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-base font-semibold text-foreground mb-4">Current plan</h2>
                <div className="flex items-center justify-between p-4 rounded-xl bg-avatar-purple/10 border border-avatar-purple/20">
                  <div>
                    <p className="font-semibold text-foreground capitalize">{user?.plan ?? "free"} plan</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.plan === "free" ? "5 videos/month · 1080p · watermarked" : "Unlimited · 4K · no watermark"}
                    </p>
                  </div>
                  {user?.plan === "free" && (
                    <Button variant="gradient" size="sm">
                      <Zap size={14} className="mr-1.5" />
                      Upgrade to Pro
                    </Button>
                  )}
                </div>
              </div>

              {user?.plan === "free" && (
                <div className="glass-card rounded-xl p-6">
                  <h2 className="text-base font-semibold text-foreground mb-4">Upgrade to Pro — $29/month</h2>
                  <ul className="space-y-2 mb-5">
                    {["Unlimited videos", "4K quality", "50+ voices + cloning", "No watermark", "Priority processing"].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check size={14} className="text-green-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant="gradient" className="w-full">Upgrade now — $29/month</Button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "notifications" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Notification preferences</h2>
              {[
                { label: "Video generation complete", desc: "Get notified when your video is ready" },
                { label: "Weekly summary", desc: "Your weekly usage and activity digest" },
                { label: "Product updates", desc: "New features and improvements" },
                { label: "Billing reminders", desc: "Payment and subscription notifications" },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-avatar-dark-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <button className="w-10 h-6 rounded-full bg-avatar-purple/30 border border-avatar-purple/40 relative">
                    <span className="absolute right-1 top-1 w-4 h-4 rounded-full bg-avatar-purple-light block" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground">Change password</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Current password</label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">New password</label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Confirm new password</label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <Button variant="gradient" onClick={() => toast.success("Password changed successfully")}>
                  Update password
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

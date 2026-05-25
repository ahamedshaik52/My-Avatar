"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/Logo";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Must contain uppercase").regex(/[0-9]/, "Must contain a number"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
type FormData = z.infer<typeof schema>;

const perks = [
  "5 free videos per month",
  "No credit card required",
  "Cancel any time",
];

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authApi.register(data);
      const tokens = await authApi.login({ email: data.email, password: data.password });
      Cookies.set("access_token", tokens.access_token, {
        expires: 1,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      const user = await authApi.me();
      setUser(user);
      toast.success("Account created! Welcome to My Avatar.");
      router.push("/dashboard");
    } catch (err) {
      const detail = (err as AxiosError<{ detail: string }>)?.response?.data?.detail ?? "";
      if (detail === "Email already registered") {
        toast.error("That email is already registered.", {
          description: "Sign in instead, or use a different email.",
          action: { label: "Sign in", onClick: () => router.push("/login") },
        });
      } else {
        toast.error("Could not create your account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-avatar-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-avatar-purple/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-avatar-cyan/10 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 sm:p-10">
          <div className="flex flex-col items-center mb-6">
            <Logo size="md" className="mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Start generating avatar videos today</p>
          </div>

          {/* Perks */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mb-6">
            {perks.map((p) => (
              <span key={p} className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check size={12} className="text-green-400" />
                {p}
              </span>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="signup-name" className="text-sm font-medium text-foreground mb-1.5 block">Full name</label>
              <Input id="signup-name" data-testid="signup-name" placeholder="Jane Smith" autoComplete="name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="signup-email" className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <Input id="signup-email" data-testid="signup-email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="signup-password" className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Input
                  id="signup-password"
                  data-testid="signup-password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-10"
                  {...register("password")}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="signup-confirm" className="text-sm font-medium text-foreground mb-1.5 block">Confirm password</label>
              <Input id="signup-confirm" data-testid="signup-confirm" type="password" placeholder="••••••••" autoComplete="new-password" {...register("confirm_password")} />
              {errors.confirm_password && <p className="text-xs text-red-400 mt-1">{errors.confirm_password.message}</p>}
            </div>

            <Button variant="gradient" size="lg" className="w-full mt-2" type="submit" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              {loading ? "Creating account…" : "Create free account"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-avatar-purple-light hover:underline">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-avatar-purple-light hover:underline">Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-avatar-purple-light hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

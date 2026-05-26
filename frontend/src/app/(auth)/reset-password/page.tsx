"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/Logo";
import { authApi } from "@/lib/api";

type TokenState = "checking" | "valid" | "invalid";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [tokenState, setTokenState] = useState<TokenState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) { setTokenState("invalid"); return; }
    authApi.validateResetToken(token)
      .then(() => setTokenState("valid"))
      .catch(() => setTokenState("invalid"));
  }, [token]);

  // Auto-redirect after success — use useEffect so cleanup is guaranteed
  useEffect(() => {
    if (!done) return;
    redirectTimer.current = setTimeout(() => router.push("/login"), 2500);
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [done, router]);

  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One number", ok: /[0-9]/.test(password) },
    { label: "Passwords match", ok: password === confirm && confirm.length > 0 },
  ];
  const valid = rules.every((r) => r.ok);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      await authApi.resetPassword(token, password, confirm);
      setDone(true);
      toast.success("Password reset! You can now sign in.");
    } catch (err) {
      const detail = (err as AxiosError<{ detail: string }>)?.response?.data?.detail;
      toast.error(detail ?? "Reset failed. Please request a new link.");
    } finally {
      setLoading(false);
    }
  };

  if (tokenState === "checking") {
    return (
      <div className="min-h-screen bg-avatar-dark flex items-center justify-center">
        <Loader2 size={32} className="text-avatar-purple animate-spin" />
      </div>
    );
  }

  if (tokenState === "invalid") {
    return (
      <div className="min-h-screen bg-avatar-dark flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-10 max-w-md w-full text-center space-y-5"
        >
          <div className="w-16 h-16 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Link expired or invalid</h2>
          <p className="text-sm text-muted-foreground">
            This reset link has expired or already been used. Request a new one.
          </p>
          <Button variant="gradient" size="lg" className="w-full" asChild>
            <Link href="/forgot-password" data-testid="request-new-link">Request new link</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-avatar-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-avatar-purple/20 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 sm:p-10">
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Password updated!</h2>
              <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={() => router.push("/login")}
                data-testid="go-to-login"
              >
                Go to sign in
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="flex flex-col items-center mb-8">
                <Logo size="md" className="mb-4" />
                <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
                <p className="text-sm text-muted-foreground mt-1">Choose a strong password.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">New password</label>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                      data-testid="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    data-testid="confirm-password"
                  />
                </div>

                {/* Password rules */}
                <ul className="space-y-1.5">
                  {rules.map((r) => (
                    <li key={r.label} className="flex items-center gap-2 text-xs">
                      <span className={r.ok ? "text-green-400" : "text-muted-foreground"}>
                        {r.ok ? "✓" : "○"}
                      </span>
                      <span className={r.ok ? "text-green-400" : "text-muted-foreground"}>{r.label}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  type="submit"
                  disabled={loading || !valid}
                  data-testid="reset-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Resetting…
                    </>
                  ) : (
                    "Reset password"
                  )}
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link href="/login" className="text-avatar-purple-light hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-avatar-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-avatar-purple" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

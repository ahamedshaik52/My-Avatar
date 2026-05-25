"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/Logo";
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      if (status === 422) {
        toast.error("Please enter a valid email address.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-avatar-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-avatar-purple/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-avatar-cyan/10 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 sm:p-10">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Check your inbox</h2>
                <p className="text-sm text-muted-foreground">
                  If <strong className="text-foreground">{email}</strong> is registered, you&apos;ll receive a reset link within a minute.
                </p>
              </div>
              <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
                Running in dev? Check your <strong className="text-foreground">API server console</strong> — the reset link is printed there.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setSent(false); setEmail(""); }}
              >
                Send to a different email
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="flex flex-col items-center mb-8">
                <Logo size="md" className="mb-4" />
                <h1 className="text-2xl font-bold text-foreground">Forgot password?</h1>
                <p className="text-sm text-muted-foreground mt-1 text-center">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    data-testid="forgot-email"
                  />
                </div>
                <Button
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  type="submit"
                  disabled={loading || !email.trim()}
                  data-testid="forgot-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail size={18} className="mr-2" />
                      Send reset link
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link
              href="/login"
              className="text-avatar-purple-light hover:underline inline-flex items-center gap-1"
              data-testid="back-to-login"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

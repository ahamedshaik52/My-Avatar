import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-avatar-dark">
      <header className="border-b border-avatar-dark-border px-6 py-4">
        <Logo size="sm" />
      </header>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>
            My Avatar (&quot;we&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains how we collect, use, and protect your data.
          </p>
          <h2 className="text-lg font-semibold text-foreground">1. Data We Collect</h2>
          <p>
            We collect your email address, name, uploaded avatar media, and generated video files. We also collect usage data to improve the service.
          </p>
          <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Data</h2>
          <p>
            Your data is used solely to provide the My Avatar service. We do not sell your data to third parties.
          </p>
          <h2 className="text-lg font-semibold text-foreground">3. Data Retention</h2>
          <p>
            Generated videos and uploaded avatars are retained for 30 days after project deletion. Account data is retained until you request deletion.
          </p>
          <h2 className="text-lg font-semibold text-foreground">4. Security</h2>
          <p>
            We use industry-standard encryption for data in transit and at rest. Access to your data is restricted to authorized personnel only.
          </p>
          <h2 className="text-lg font-semibold text-foreground">5. Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time by contacting us.
          </p>
          <h2 className="text-lg font-semibold text-foreground">6. Cookies</h2>
          <p>
            We use a single authentication cookie to keep you signed in. No tracking or advertising cookies are used.
          </p>
        </div>
        <div className="mt-12">
          <Link href="/" className="text-avatar-purple-light hover:underline text-sm">← Back to home</Link>
        </div>
      </main>
    </div>
  );
}

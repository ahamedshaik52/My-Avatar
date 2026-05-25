import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-avatar-dark">
      <header className="border-b border-avatar-dark-border px-6 py-4">
        <Logo size="sm" />
      </header>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-4">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>
            By accessing or using My Avatar, you agree to be bound by these Terms of Service. Please read them carefully.
          </p>
          <h2 className="text-lg font-semibold text-foreground">1. Use of Service</h2>
          <p>
            You may use My Avatar for lawful purposes only. You are responsible for all content you upload and generate using the platform.
          </p>
          <h2 className="text-lg font-semibold text-foreground">2. Account</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately of any unauthorized use.
          </p>
          <h2 className="text-lg font-semibold text-foreground">3. Content</h2>
          <p>
            You retain ownership of content you upload. By uploading content, you grant My Avatar a limited license to process it for the purpose of video generation.
          </p>
          <h2 className="text-lg font-semibold text-foreground">4. Prohibited Uses</h2>
          <p>
            You may not use the service to create deepfakes of real people without their consent, generate illegal content, or violate any applicable laws.
          </p>
          <h2 className="text-lg font-semibold text-foreground">5. Limitation of Liability</h2>
          <p>
            My Avatar is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from use of the service.
          </p>
        </div>
        <div className="mt-12">
          <Link href="/" className="text-avatar-purple-light hover:underline text-sm">← Back to home</Link>
        </div>
      </main>
    </div>
  );
}

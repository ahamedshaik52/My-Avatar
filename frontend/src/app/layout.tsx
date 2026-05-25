import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/shared/QueryProvider";
import { ThemeProvider } from "@/components/shared/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "My Avatar — AI Video Generation Platform",
    template: "%s | My Avatar",
  },
  description:
    "Create stunning AI avatar videos with your voice in minutes. Upload your avatar, write your script, and generate professional lip-synced videos.",
  keywords: ["AI avatar", "video generation", "text to video", "voice synthesis", "lip sync"],
  authors: [{ name: "My Avatar Team" }],
  creator: "My Avatar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://myavatar.ai",
    title: "My Avatar — AI Video Generation Platform",
    description: "Create stunning AI avatar videos in minutes",
    siteName: "My Avatar",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Avatar — AI Video Generation Platform",
    description: "Create stunning AI avatar videos in minutes",
    creator: "@myavatar_ai",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <QueryProvider>
            {children}
            <Toaster position="bottom-right" theme="dark" richColors />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

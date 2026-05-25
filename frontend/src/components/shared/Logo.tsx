import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

export function Logo({ size = "md", className, showText = true }: LogoProps) {
  const iconSize = { sm: 28, md: 36, lg: 52 }[size];
  const textClass = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Original SVG logo mark — concentric rings + central spark */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="My Avatar logo"
      >
        <defs>
          <radialGradient id="logoGrad1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#7C3AED" />
          </radialGradient>
          <radialGradient id="logoGrad2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="100%" stopColor="#06B6D4" />
          </radialGradient>
          <linearGradient id="logoGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="50%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        {/* Outer ring */}
        <circle cx="26" cy="26" r="24" stroke="url(#logoGrad3)" strokeWidth="1.5" fill="none" opacity="0.4" />
        {/* Middle ring */}
        <circle cx="26" cy="26" r="17" stroke="url(#logoGrad1)" strokeWidth="1.5" fill="none" opacity="0.6" />
        {/* Inner filled circle */}
        <circle cx="26" cy="26" r="10" fill="url(#logoGrad1)" />
        {/* Cyan accent arc */}
        <path
          d="M 26 9 A 17 17 0 0 1 43 26"
          stroke="url(#logoGrad2)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Central spark / play triangle */}
        <polygon
          points="23,21 23,31 32,26"
          fill="white"
          opacity="0.95"
        />
      </svg>

      {showText && (
        <span className={cn("font-bold tracking-tight", textClass)}>
          <span className="gradient-text">My</span>
          <span className="text-foreground ml-1">Avatar</span>
        </span>
      )}
    </div>
  );
}

import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

interface AppShellProps {
  children?: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  const { theme } = useTheme();

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-x-hidden bg-background text-foreground",
        theme === "dark"
          ? "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_28%)]"
          : "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_24%)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_18%,transparent_82%,rgba(0,0,0,0.03))] dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_18%,transparent_82%,rgba(0,0,0,0.2))]" />
      <div className="relative min-h-screen">{children}</div>
    </div>
  );
}

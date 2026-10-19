"use client";

import * as React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

export function Header() {
  const [telemetry, setTelemetry] = React.useState<{
    totalTokens: number;
    monthlyLimit: number;
    percentage: number;
  }>({
    totalTokens: 0,
    monthlyLimit: 500000,
    percentage: 0,
  });

  const fetchTelemetry = React.useCallback(async () => {
    try {
      const res = await fetch("/api/telemetry");
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch {
      // Keep existing state if offline or auth error
    }
  }, []);

  React.useEffect(() => {
    fetchTelemetry();

    const handleUpdate = () => fetchTelemetry();
    window.addEventListener("ragadv:tokens-updated", handleUpdate);
    return () => window.removeEventListener("ragadv:tokens-updated", handleUpdate);
  }, [fetchTelemetry]);

  const formattedTokens =
    telemetry.totalTokens >= 1000
      ? `${(telemetry.totalTokens / 1000).toFixed(1)}k`
      : telemetry.totalTokens.toString();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="h-7 px-2.5 text-xs font-normal gap-1.5 border-border/60">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Category:</span>
          <span className="font-semibold text-foreground">Engineering Operations</span>
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        {/* Token Budget Gauge */}
        <div
          data-testid="token-gauge"
          className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-muted/40 border border-border/40 text-xs"
        >
          <Zap className="size-3.5 text-amber-500" />
          <span className="text-muted-foreground">Tokens:</span>
          <span className="font-semibold">{formattedTokens} / 500k</span>
          <span className="text-[10px] text-muted-foreground">({telemetry.percentage}%)</span>
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}


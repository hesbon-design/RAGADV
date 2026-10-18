"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shake, setShake] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invalid master password");
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError("Network error. Please try again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <div className={`w-full max-w-md transition-transform ${shake ? "animate-shake" : ""}`}>
        <Card className="border-border/60 shadow-lg">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
              <ShieldCheck className="size-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">RAGADV</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enterprise Document Compliance & Audit Hub
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Master Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter operator master password"
                    autoFocus
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className={`pr-10 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {error && (
                  <p className="text-xs font-medium text-destructive mt-1.5 animate-fadeIn">
                    {error}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full h-10 gap-2" disabled={loading || !password}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Unlock Command Center
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                🔒 Single-Operator Session Guard
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
  FileCheck2,
  Lock,
  Search,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Navigation Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold tracking-tight shadow-xs">
              RA
            </div>
            <span className="font-bold text-lg tracking-tight">RAGADV</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold ml-1">
              v3.6 Enterprise
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Operator Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
            >
              Command Center
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-6 max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/5 text-primary text-xs font-semibold">
            <Sparkles className="size-3.5" />
            The Enterprise ATS for Operational Reports & Compliance Audits
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Automate Document Reviews.{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Build a Self-Learning
            </span>{" "}
            Knowledge Archive.
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Eliminate cognitive review fatigue, catch non-compliant budget shifts and safety violations with deterministic AI scorecards, and cross-reference institutional memory with hybrid RAG.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md transition-all cursor-pointer"
            >
              Enter Operator Command Center
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-card-foreground text-sm font-semibold hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <Lock className="size-4 text-muted-foreground" />
              Secure Operator Login
            </Link>
          </div>

          {/* Social Proof & Operational Economics */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            {[
              { label: "Human Review Agreement", val: "95%", desc: "Primary acceptance metric" },
              { label: "Audit Latency", val: "< 4.5s", desc: "Per 12-page report" },
              { label: "Token Budget Bouncer", val: "32K Max", desc: "Prevents runaway cloud costs" },
              { label: "Trust Architecture", val: "Zero Leak", desc: "No public LLM exposure" },
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-xs">
                <div className="text-2xl font-bold tracking-tight text-foreground">{stat.val}</div>
                <div className="text-xs font-semibold text-foreground/90 mt-0.5">{stat.label}</div>
                <div className="text-[11px] text-muted-foreground">{stat.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Core Pillars */}
        <section id="architecture" className="py-16 px-6 max-w-6xl mx-auto border-t border-border/40">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Enterprise ATS Architecture for Institutional Governance
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Engineered with Next.js App Router, PostgreSQL pgvector, and Vercel AI SDK.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <FileCheck2 className="size-5" />
              </div>
              <h3 className="text-base font-semibold">1. Deterministic Scorecards</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evaluates documents against strict mandatory sections, quantitative threshold gates, and linguistic tripwires with verbatim quotes and page numbers.
              </p>
              <ul className="text-xs space-y-1.5 pt-2 text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-500" /> 1-Click revision feedback memos
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-500" /> Supervisory override audit trail
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Database className="size-5" />
              </div>
              <h3 className="text-base font-semibold">2. Hybrid RRF Search</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Contextual retrieval chunking with Anthropic-style metadata headers, fused via Reciprocal Rank Fusion (k=60) combining vector cosine distance and Full-Text Search.
              </p>
              <ul className="text-xs space-y-1.5 pt-2 text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-500" /> 768-d Gemini dense vectors
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-500" /> Exact code/acronym FTS retrieval
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Sparkles className="size-5" />
              </div>
              <h3 className="text-base font-semibold">3. Knowledge Reflection</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upon report approval, the system autonomously synthesizes 3-sentence cross-report insights and periodic consolidated summaries with ranking multipliers.
              </p>
              <ul className="text-xs space-y-1.5 pt-2 text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-500" /> 1.5× Reflection ranking boost
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-500" /> 1.8× Consolidated summary boost
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">RAGADV</span>
            <span>• Self-Learning Knowledge Reflection Architecture</span>
          </div>
          <div>Protected under single-operator encrypted session guard.</div>
        </div>
      </footer>
    </div>
  );
}

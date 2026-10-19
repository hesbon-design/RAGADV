"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BotMessageSquare,
  Sparkles,
  Send,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  Database,
  Search,
} from "lucide-react";

interface SourceItem {
  index: number;
  id: string;
  docType: "raw" | "reflection" | "summary";
  filename: string;
  section: string;
  content: string;
  reflectionScore: number;
  rrfScore: number;
}

interface ReflectionItem {
  id: string;
  docType: "reflection" | "summary";
  content: string;
  reflectionScore: number;
  sourceReferences?: any;
}

interface Department {
  id: string;
  name: string;
}

export default function ArchivePage() {
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = React.useState<string>("ALL");
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [activeQuestion, setActiveQuestion] = React.useState<string | null>(null);
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [sources, setSources] = React.useState<SourceItem[]>([]);
  const [reflections, setReflections] = React.useState<ReflectionItem[]>([]);
  const [expandedSourceIndex, setExpandedSourceIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch("/api/departments")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (data.departments) {
          setDepartments(data.departments);
        }
      })
      .catch((err) => console.error("Failed to load departments:", err));
  }, []);

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || query;
    if (!q.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setActiveQuestion(q.trim());
    setAnswer(null);
    setSources([]);
    setReflections([]);
    setExpandedSourceIndex(null);

    try {
      const res = await fetch("/api/archive/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q.trim(),
          departmentId: selectedDept !== "ALL" ? selectedDept : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to query the knowledge archive");
      }

      setAnswer(data.answer);
      setSources(data.sources || []);
      setReflections(data.reflections || []);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during archive retrieval");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn pb-12">
      {/* Header & Department Scope */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Ask Archive & Knowledge Reflection
            </h1>
            <Badge variant="outline" className="text-[11px] font-semibold border-primary/20 bg-primary/5 text-primary">
              Hybrid RRF Search
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Query the permanent institutional memory vault with dense vector cosine similarity and sparse full-text search.
          </p>
        </div>

        {/* Scope selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="dept-select" className="text-xs font-medium text-muted-foreground">
            Scope:
          </label>
          <select
            id="dept-select"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-ring font-medium"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium flex items-center gap-1">
          <Sparkles className="size-3 text-primary" /> Suggested:
        </span>
        {[
          "What were the recurring safety violations noted in recent audits?",
          "Strategic Cloud Migration and PostgreSQL Replication milestones",
          "High-Performance Computing Cluster infrastructure governance",
          "What open risks or gaps remain across recent compliance reviews?",
        ].map((suggestion, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setQuery(suggestion);
              handleSearch(suggestion);
            }}
            className="px-2.5 py-1 rounded-full border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-[11px]"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Natural Language Prompt Input Bar */}
      <Card className="border-border/60 shadow-xs">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question across approved reports, compliance trends, or supplier audits..."
                className="w-full bg-transparent pl-9 pr-4 py-2.5 text-sm focus:outline-hidden text-foreground placeholder:text-muted-foreground/70"
                disabled={isLoading}
              />
            </div>
            <Button
              type="button"
              onClick={() => handleSearch()}
              disabled={isLoading || !query.trim()}
              size="sm"
              className="gap-1.5 px-4 h-9"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Ask Archive
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Loading Shimmer State */}
      {isLoading && (
        <Card className="border-border/50 animate-pulse bg-muted/10">
          <CardContent className="p-6 space-y-4">
            <div className="h-4 bg-muted rounded-md w-3/4"></div>
            <div className="h-4 bg-muted rounded-md w-full"></div>
            <div className="h-4 bg-muted rounded-md w-5/6"></div>
          </CardContent>
        </Card>
      )}

      {/* Results Viewport */}
      {answer && (
        <div className="space-y-5 animate-fadeIn">
          {/* Knowledge Reflection Highlight Cards */}
          {reflections.length > 0 && (
            <div className="space-y-3">
              {reflections.map((refl, idx) => (
                <div
                  key={refl.id || idx}
                  className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-foreground space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-primary">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5" />
                      {refl.docType === "summary"
                        ? "💡 Consolidated Cross-Report Summary"
                        : "💡 3-Sentence Knowledge Reflection"}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {refl.reflectionScore}× Multiplier
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90 font-medium">
                    {refl.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Conversational Answer Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
              <div className="flex items-center gap-2">
                <BotMessageSquare className="size-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Grounded Archive Synthesis</CardTitle>
              </div>
              {activeQuestion && (
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Query: &ldquo;{activeQuestion}&rdquo;
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/95">
                {answer}
              </p>
            </CardContent>
          </Card>

          {/* Sources & Citations Drawer */}
          {sources.length > 0 && (
            <Card className="border-border/50 bg-muted/5">
              <CardHeader className="py-3 px-4 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" /> Sources & Retrieved Chunks ({sources.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Fused with Reciprocal Rank Fusion (k=60)
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-3 divide-y divide-border/40">
                {sources.map((src) => {
                  const isExpanded = expandedSourceIndex === src.index;
                  return (
                    <div key={src.id} className="py-2.5 first:pt-1 last:pb-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSourceIndex(isExpanded ? null : src.index)
                        }
                        className="w-full flex items-center justify-between text-left hover:bg-muted/30 p-2 rounded-md transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex-shrink-0 size-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center">
                            [{src.index}]
                          </span>
                          <span className="text-xs font-medium text-foreground truncate">
                            {src.filename}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                            {src.docType}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                            • {src.section}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                          <span className="font-mono text-[11px]">RRF: {src.rrfScore}</span>
                          {isExpanded ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-lg bg-background border text-xs text-foreground/90 font-mono leading-relaxed whitespace-pre-wrap ml-7">
                          {src.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty Initial State */}
      {!answer && !isLoading && !error && (
        <Card className="border-border/60 bg-muted/15 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 px-6 text-center max-w-lg mx-auto">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <BotMessageSquare className="size-6" />
            </div>
            <h3 className="text-base font-semibold tracking-tight">
              Institutional Memory & Knowledge Archive
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Every approved operational report is contextually chunked, vector-embedded with Google Gemini, and indexed with PostgreSQL Full-Text Search.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left text-xs">
              <div className="p-3 rounded-lg border bg-background space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
                  <Database className="size-3 text-primary" /> Hybrid Search
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Combines dense semantic cosine similarity with exact keyword matching via RRF (k=60).
                </p>
              </div>

              <div className="p-3 rounded-lg border bg-background space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
                  <Sparkles className="size-3 text-primary" /> Self-Learning Memory
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Synthesizes 3-sentence cross-report reflections on approval and consolidates persistent trends.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Download,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  AlertOctagon,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export interface ScorecardDetailProps {
  report: {
    id: string;
    filename: string;
    file_hash: string;
    page_count: number;
    review_status: string;
    uploaded_at: string;
    reviewed_at: string;
    department_name: string;
  };
  scorecard: {
    id: string;
    overall_score: number;
    compliance_status: "APPROVED" | "ACTION_REQUIRED" | "REJECTED";
    executive_summary: string[];
    feedback_draft: string;
    input_tokens: number;
    output_tokens: number;
    latency_ms: number;
    generated_at: string;
  } | null;
  ruleChecks: Array<{
    id: string;
    rule_id: string;
    rule_title: string;
    rule_type: "mandatory_section" | "threshold_breach" | "red_flag" | "custom";
    verdict: "PASS" | "FAIL" | "WARNING";
    penalty_applied: number;
    finding_summary: string;
    cited_evidence?: string | null;
    page_number?: number | null;
  }>;
}

export function ScorecardInspector({
  report,
  scorecard,
  ruleChecks,
}: ScorecardDetailProps) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = React.useState(false);
  const [overrideStatus, setOverrideStatus] = React.useState<"APPROVED" | "ACTION_REQUIRED" | "REJECTED">("APPROVED");
  const [overrideReason, setOverrideReason] = React.useState("");
  const [isSubmittingOverride, setIsSubmittingOverride] = React.useState(false);
  const [expandedCitation, setExpandedCitation] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [docViewMode, setDocViewMode] = React.useState<"preview" | "raw">("preview");

  const currentScore = scorecard?.overall_score ?? 0;
  const currentStatus = scorecard?.compliance_status ?? report.review_status;

  const handleCopyMemo = async () => {
    if (!scorecard?.feedback_draft) return;
    try {
      await navigator.clipboard.writeText(scorecard.feedback_draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy feedback memo:", err);
    }
  };

  const handleOverrideSubmit = async () => {
    setIsSubmittingOverride(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStatus: overrideStatus,
          overrideReason: overrideReason.trim() || "Manual supervisory override",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit override");
      }

      setOverrideModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Override failed:", err);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Filter rule checks by tab
  const filteredChecks = React.useMemo(() => {
    if (activeTab === "all") return ruleChecks;
    if (activeTab === "failures") return ruleChecks.filter((c) => c.verdict !== "PASS");
    if (activeTab === "mandatory") return ruleChecks.filter((c) => c.rule_type === "mandatory_section");
    if (activeTab === "thresholds") return ruleChecks.filter((c) => c.rule_type === "threshold_breach");
    if (activeTab === "redflags") return ruleChecks.filter((c) => c.rule_type === "red_flag");
    return ruleChecks;
  }, [ruleChecks, activeTab]);

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] -m-4 sm:-m-6 overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card/60 backdrop-blur-xs shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="size-8">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold tracking-tight truncate max-w-[300px] sm:max-w-md">
              {report.filename}
            </h1>
            <Badge variant="secondary" className="text-[11px] font-mono">
              {report.page_count} {report.page_count === 1 ? "page" : "pages"}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {report.department_name}
            </Badge>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          <a
            href={`/api/reports/${report.id}/file`}
            download={report.filename}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Download className="size-3.5" />
              Download
            </Button>
          </a>

          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setOverrideModalOpen(true)}
          >
            <ShieldCheck className="size-3.5" />
            Supervisory Override
          </Button>
        </div>
      </div>

      {/* 60/40 Split Content Area */}
      <div className="flex flex-1 min-h-0 divide-x overflow-hidden">
        {/* Left Pane (60%): Document Viewer */}
        <div className="w-full lg:w-[60%] flex flex-col bg-muted/20 min-h-0">
          {/* Document View Controls */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-background/50 text-xs">
            <div className="flex items-center gap-2">
              <Button
                variant={docViewMode === "preview" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDocViewMode("preview")}
              >
                Document Viewer
              </Button>
              <Button
                variant={docViewMode === "raw" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDocViewMode("raw")}
              >
                Raw Source File
              </Button>
            </div>
            <span className="text-muted-foreground text-[11px] font-mono">
              SHA-256: {report.file_hash.substring(0, 12)}...
            </span>
          </div>

          {/* Document Content View */}
          <div className="flex-1 min-h-0 relative bg-muted/30">
            {docViewMode === "preview" ? (
              <iframe
                src={`/api/reports/${report.id}/file`}
                className="w-full h-full border-0 bg-background"
                title="Document Inspector"
              />
            ) : (
              <div className="p-6 overflow-auto h-full text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap select-text">
                <div className="mb-4 p-3 rounded-lg border bg-card text-foreground">
                  <div className="font-semibold text-sm">File Information</div>
                  <div>Filename: {report.filename}</div>
                  <div>Department: {report.department_name}</div>
                  <div>Uploaded: {new Date(report.uploaded_at).toLocaleString()}</div>
                  <div>Full SHA-256: {report.file_hash}</div>
                </div>
                <p>
                  To inspect binary documents (PDF/DOCX) with interactive annotations, switch to &quot;Document Viewer&quot; mode above.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane (40%): Scorecard & Findings */}
        <div className="w-full lg:w-[40%] flex flex-col bg-background min-h-0 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Top Score Banner */}
            <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Compliance Verdict
                    </span>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div
                        className={`text-3xl font-extrabold font-mono tracking-tight ${
                          currentScore >= 85
                            ? "text-emerald-600 dark:text-emerald-400"
                            : currentScore >= 70
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-destructive"
                        }`}
                      >
                        {currentScore}
                        <span className="text-sm font-normal text-muted-foreground">/100</span>
                      </div>

                      {currentStatus === "APPROVED" && (
                        <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-0.5">
                          <CheckCircle2 className="size-3.5 mr-1" />
                          APPROVED
                        </Badge>
                      )}
                      {currentStatus === "ACTION_REQUIRED" && (
                        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2.5 py-0.5">
                          <AlertTriangle className="size-3.5 mr-1" />
                          ACTION REQUIRED
                        </Badge>
                      )}
                      {currentStatus === "REJECTED" && (
                        <Badge variant="destructive" className="text-xs font-bold px-2.5 py-0.5">
                          <XCircle className="size-3.5 mr-1" />
                          REJECTED
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    <div>Latency: {scorecard ? `${(scorecard.latency_ms / 1000).toFixed(2)}s` : "—"}</div>
                    <div>Tokens: {scorecard ? `${scorecard.input_tokens + scorecard.output_tokens}` : "—"}</div>
                  </div>
                </div>

                {/* Executive Summary Bullet Points */}
                {scorecard?.executive_summary && scorecard.executive_summary.length > 0 && (
                  <div className="mt-4 pt-3 border-t text-xs space-y-1.5">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                      Executive Summary
                    </span>
                    {scorecard.executive_summary.map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-foreground/90">
                        <span className="text-primary font-bold">•</span>
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 1-Click Feedback Memo Generator */}
            {scorecard?.feedback_draft && (
              <Card className="border-border/60 bg-muted/15 shadow-xs">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Sparkles className="size-3.5 text-primary" />
                      1-Click Feedback Memo for Submitter
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={handleCopyMemo}
                    >
                      {copied ? (
                        <>
                          <Check className="size-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Copied!
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copy Memo</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <p className="text-xs font-mono bg-background/80 p-3 rounded-md border text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {scorecard.feedback_draft}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Rule Checklist with Verbatim Citations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight">Compliance Rule Checks</h3>
                <Badge variant="secondary" className="text-[11px] font-mono">
                  {ruleChecks.length} Audited
                </Badge>
              </div>

              {/* Tabs for Rule Types */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-5 h-8 text-[11px]">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="failures">Issues</TabsTrigger>
                  <TabsTrigger value="mandatory">Sections</TabsTrigger>
                  <TabsTrigger value="thresholds">Gates</TabsTrigger>
                  <TabsTrigger value="redflags">Tripwires</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Rule Cards List */}
              <div className="space-y-2.5">
                {filteredChecks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No rules found in this category.
                  </div>
                ) : (
                  filteredChecks.map((check) => {
                    const isExpanded = expandedCitation === check.id;

                    return (
                      <Card
                        key={check.id}
                        className={`p-3.5 transition-colors border-border/60 ${
                          check.verdict === "FAIL"
                            ? "bg-destructive/5 border-destructive/30"
                            : check.verdict === "WARNING"
                            ? "bg-amber-500/5 border-amber-500/30"
                            : "bg-card"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {check.verdict === "PASS" && (
                                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                              )}
                              {check.verdict === "WARNING" && (
                                <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                              )}
                              {check.verdict === "FAIL" && (
                                <XCircle className="size-4 text-destructive shrink-0" />
                              )}
                              <h4 className="text-xs font-semibold truncate">
                                {check.rule_title}
                              </h4>
                            </div>

                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {check.finding_summary}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            {check.penalty_applied > 0 ? (
                              <Badge variant="destructive" className="text-[11px] font-mono">
                                -{check.penalty_applied} pts
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px]">
                                Pass
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Verbatim Evidence Citation */}
                        {check.cited_evidence && (
                          <div className="mt-3 pt-2.5 border-t border-border/40">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCitation(isExpanded ? null : check.id)
                              }
                              className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
                            >
                              <span>
                                {isExpanded ? "Hide verbatim citation" : "Inspect cited evidence"}
                              </span>
                              {check.page_number && (
                                <span className="text-muted-foreground font-mono">
                                  (p. {check.page_number})
                                </span>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="size-3" />
                              ) : (
                                <ChevronDown className="size-3" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-2 p-2.5 rounded bg-muted/50 border text-[11px] font-mono leading-relaxed text-foreground/90 italic">
                                &ldquo;{check.cited_evidence}&rdquo;
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supervisory Override Dialog */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supervisory Compliance Override</DialogTitle>
            <DialogDescription>
              As the compliance auditor, you can manually override the automated scorecard verdict. This action is permanently stamped in the audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold block mb-2">New Compliance Verdict</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={overrideStatus === "APPROVED" ? "default" : "outline"}
                  className="h-9 text-xs"
                  onClick={() => setOverrideStatus("APPROVED")}
                >
                  <CheckCircle2 className="size-3.5 mr-1 text-emerald-500" />
                  Approve
                </Button>
                <Button
                  type="button"
                  variant={overrideStatus === "ACTION_REQUIRED" ? "default" : "outline"}
                  className="h-9 text-xs"
                  onClick={() => setOverrideStatus("ACTION_REQUIRED")}
                >
                  <AlertTriangle className="size-3.5 mr-1 text-amber-500" />
                  Action Req
                </Button>
                <Button
                  type="button"
                  variant={overrideStatus === "REJECTED" ? "default" : "outline"}
                  className="h-9 text-xs"
                  onClick={() => setOverrideStatus("REJECTED")}
                >
                  <XCircle className="size-3.5 mr-1 text-destructive" />
                  Reject
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">
                Auditor Rationale & Justification
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Document the exact basis for overriding this report verdict..."
                className="w-full text-xs p-2.5 rounded-md border bg-background font-sans focus:outline-none focus:ring-1 focus:ring-primary min-h-[90px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOverrideModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmittingOverride}
              onClick={handleOverrideSubmit}
            >
              {isSubmittingOverride ? "Saving..." : "Stamp Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

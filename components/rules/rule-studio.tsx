"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ShieldAlert,
  CheckCircle2,
  Plus,
  X,
  Save,
  RotateCcw,
  Sliders,
  AlertTriangle,
  FileText,
  Tag,
  Check,
} from "lucide-react";

interface RuleStudioProps {
  initialDepartment: {
    id: string;
    name: string;
  };
  initialProfile: {
    id: string;
    title: string;
    category: string;
    latestVersion: {
      id: string;
      version_number: number;
      mandatory_sections: string[];
      threshold_rules: Array<{
        id: string;
        metric_name: string;
        operator: string;
        target_value: number;
        unit: string;
        penalty: number;
        is_critical: boolean;
      }>;
      red_flag_keywords: string[];
      custom_rule_cards: Array<{
        id: string;
        title: string;
        description: string;
        weight: number;
        severity: string;
      }>;
    } | null;
  } | null;
}

export function RuleStudio({ initialDepartment, initialProfile }: RuleStudioProps) {
  const router = useRouter();

  const latest = initialProfile?.latestVersion;

  const [mandatorySections, setMandatorySections] = React.useState<string[]>(
    latest?.mandatory_sections || [
      "Executive Summary",
      "Milestone Progress Matrix",
      "Risk Register",
      "Financial Expenditure Log",
    ]
  );
  const [newSectionInput, setNewSectionInput] = React.useState("");

  const [thresholdRules, setThresholdRules] = React.useState(
    latest?.threshold_rules || [
      {
        id: "thresh-budget",
        metric_name: "Budget Variance Ceiling",
        operator: "<=",
        target_value: 10,
        unit: "%",
        penalty: 20,
        is_critical: true,
      },
      {
        id: "thresh-delay",
        metric_name: "Schedule Slippage",
        operator: "<=",
        target_value: 14,
        unit: "days",
        penalty: 15,
        is_critical: false,
      },
    ]
  );

  const [redFlagKeywords, setRedFlagKeywords] = React.useState<string[]>(
    latest?.red_flag_keywords || [
      "stop work order",
      "unapproved subcontractor",
      "safety breach",
      "regulatory violation",
    ]
  );
  const [newKeywordInput, setNewKeywordInput] = React.useState("");

  const [customRules, setCustomRules] = React.useState(
    latest?.custom_rule_cards || [
      {
        id: "custom-safety",
        title: "Safety Incident Verification",
        description: "All safety incidents mentioned must include corrective action documentation.",
        weight: 15,
        severity: "CRITICAL",
      },
    ]
  );

  const [isSaving, setIsSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const handleAddSection = () => {
    if (!newSectionInput.trim()) return;
    if (!mandatorySections.includes(newSectionInput.trim())) {
      setMandatorySections([...mandatorySections, newSectionInput.trim()]);
    }
    setNewSectionInput("");
  };

  const handleRemoveSection = (sec: string) => {
    setMandatorySections(mandatorySections.filter((s) => s !== sec));
  };

  const handleAddKeyword = () => {
    if (!newKeywordInput.trim()) return;
    if (!redFlagKeywords.includes(newKeywordInput.trim().toLowerCase())) {
      setRedFlagKeywords([...redFlagKeywords, newKeywordInput.trim().toLowerCase()]);
    }
    setNewKeywordInput("");
  };

  const handleRemoveKeyword = (kw: string) => {
    setRedFlagKeywords(redFlagKeywords.filter((k) => k !== kw));
  };

  const handleUpdateThreshold = (
    id: string,
    field: string,
    value: string | number | boolean
  ) => {
    setThresholdRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAddThreshold = () => {
    const newId = `thresh-${Date.now().toString(36)}`;
    setThresholdRules((prev) => [
      ...prev,
      {
        id: newId,
        metric_name: "New Variance Metric",
        operator: "<=",
        target_value: 10,
        unit: "%",
        penalty: 15,
        is_critical: false,
      },
    ]);
  };

  const handleRemoveThreshold = (id: string) => {
    setThresholdRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateCustomRule = (
    id: string,
    field: string,
    value: string | number
  ) => {
    setCustomRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAddCustomRule = () => {
    const newId = `custom-${Date.now().toString(36)}`;
    setCustomRules((prev) => [
      ...prev,
      {
        id: newId,
        title: "New Evaluation Directive",
        description: "Specify criteria the evaluator must check in the report narrative.",
        weight: 10,
        severity: "HIGH",
      },
    ]);
  };

  const handleRemoveCustomRule = (id: string) => {
    setCustomRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: initialProfile?.id,
          departmentId: initialDepartment.id,
          title: initialProfile?.title || "Operational Compliance Audit",
          category: initialProfile?.category || "Engineering",
          mandatorySections,
          thresholdRules,
          redFlagKeywords,
          customRuleCards: customRules,
        }),
      });

      if (!res.ok) throw new Error("Failed to save rule profile");

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      router.refresh();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Compliance Rule Studio</h1>
            <Badge variant="outline" className="font-mono text-xs">
              v{latest?.version_number ?? 1}.0 Active
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure mandatory sections, numeric gates, and red-flag tripwires for{" "}
            <span className="font-semibold text-foreground">{initialDepartment.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="h-9 gap-1.5"
          >
            {savedSuccess ? (
              <>
                <Check className="size-4 text-emerald-400" />
                <span>Saved v{(latest?.version_number ?? 1) + 1}!</span>
              </>
            ) : (
              <>
                <Save className="size-4" />
                <span>{isSaving ? "Saving..." : "Publish New Version"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* 1. Mandatory Sections Gate */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">
                Mandatory Structural Sections
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Reports missing any of these required headings trigger a -25 point penalty and instant rejection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {mandatorySections.map((section) => (
                <Badge
                  key={section}
                  variant="secondary"
                  className="pl-2.5 pr-1.5 py-1 text-xs gap-1.5 border"
                >
                  <span>{section}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSection(section)}
                    className="hover:text-destructive rounded-full p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-md">
              <Input
                value={newSectionInput}
                onChange={(e) => setNewSectionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSection();
                  }
                }}
                placeholder="Add required section title..."
                className="h-8 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={handleAddSection}
              >
                <Plus className="size-3.5" />
                Add Section
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Quantitative Threshold Gates */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Quantitative Threshold Gates
                </CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Numeric tolerance ceilings extracted from document matrices and tables.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddThreshold}
              className="h-8 text-xs gap-1"
            >
              <Plus className="size-3.5" />
              Add Gate
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {thresholdRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3.5 rounded-lg border bg-card/60 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={rule.metric_name}
                      onChange={(e) => handleUpdateThreshold(rule.id, "metric_name", e.target.value)}
                      placeholder="Metric Name"
                      className="h-7 text-xs font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveThreshold(rule.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Operator</label>
                      <select
                        value={rule.operator}
                        onChange={(e) => handleUpdateThreshold(rule.id, "operator", e.target.value)}
                        className="w-full h-7 rounded-md border border-input bg-background px-1 text-xs font-mono"
                      >
                        <option value="<=">&le; (Max)</option>
                        <option value=">=">&ge; (Min)</option>
                        <option value="<">&lt;</option>
                        <option value=">">&gt;</option>
                        <option value="==">==</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Target</label>
                      <Input
                        type="number"
                        value={rule.target_value}
                        onChange={(e) => handleUpdateThreshold(rule.id, "target_value", parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Unit</label>
                      <Input
                        value={rule.unit}
                        onChange={(e) => handleUpdateThreshold(rule.id, "unit", e.target.value)}
                        className="h-7 text-xs font-mono"
                        placeholder="%, days"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Penalty</label>
                      <Input
                        type="number"
                        value={rule.penalty}
                        onChange={(e) => handleUpdateThreshold(rule.id, "penalty", parseInt(e.target.value, 10) || 0)}
                        className="h-7 text-xs font-mono text-destructive"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={rule.is_critical}
                        onChange={(e) => handleUpdateThreshold(rule.id, "is_critical", e.target.checked)}
                        className="rounded border-input text-primary size-3.5"
                      />
                      <span>Critical Gate (Fails report)</span>
                    </label>
                    {rule.is_critical && (
                      <Badge variant="destructive" className="text-[9px] uppercase font-bold py-0 h-4">
                        Critical
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. Red-Flag Tripwire Keywords */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-destructive" />
              <CardTitle className="text-base font-semibold">
                Red-Flag Tripwire Keywords
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              High-risk operational phrases that trigger immediate auditor warnings and point deductions (-15 pts).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {redFlagKeywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="outline"
                  className="border-destructive/30 bg-destructive/5 text-destructive pl-2.5 pr-1.5 py-1 text-xs gap-1.5"
                >
                  <Tag className="size-3" />
                  <span>&quot;{keyword}&quot;</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="hover:opacity-75 rounded-full p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-md">
              <Input
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                placeholder="Add tripwire phrase (e.g. litigation, crack)..."
                className="h-8 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={handleAddKeyword}
              >
                <Plus className="size-3.5" />
                Add Tripwire
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 4. Custom Evaluator Directives */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Custom Evaluator Directives
                </CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Natural language criteria instructions evaluated by the Gemini auditor model.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCustomRule}
              className="h-8 text-xs gap-1"
            >
              <Plus className="size-3.5" />
              Add Directive
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {customRules.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No custom directives configured. Add one to guide the LLM evaluation.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {customRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3.5 rounded-lg border bg-card/60 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={rule.title}
                        onChange={(e) => handleUpdateCustomRule(rule.id, "title", e.target.value)}
                        placeholder="Directive Title"
                        className="h-7 text-xs font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomRule(rule.id)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>

                    <div>
                      <textarea
                        value={rule.description}
                        onChange={(e) => handleUpdateCustomRule(rule.id, "description", e.target.value)}
                        placeholder="Detailed requirement or instructions..."
                        rows={2}
                        className="w-full rounded-md border border-input bg-background p-2 text-xs font-sans resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground">Penalty:</label>
                        <Input
                          type="number"
                          value={rule.weight}
                          onChange={(e) => handleUpdateCustomRule(rule.id, "weight", parseInt(e.target.value, 10) || 0)}
                          className="h-6 w-16 text-xs font-mono text-destructive"
                        />
                        <span className="text-[10px] text-muted-foreground">pts</span>
                      </div>

                      <select
                        value={rule.severity}
                        onChange={(e) => handleUpdateCustomRule(rule.id, "severity", e.target.value)}
                        className="h-6 rounded-md border border-input bg-background px-1.5 text-[10px] font-semibold uppercase"
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

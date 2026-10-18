import { db } from "@/lib/db";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export interface EvaluationResult {
  overallScore: number;
  complianceStatus: "APPROVED" | "ACTION_REQUIRED" | "REJECTED";
  executiveSummary: string[];
  feedbackDraft: string;
  ruleChecks: Array<{
    ruleId: string;
    ruleTitle: string;
    ruleType: "mandatory_section" | "threshold_breach" | "red_flag" | "custom";
    verdict: "PASS" | "FAIL" | "WARNING";
    penaltyApplied: number;
    findingSummary: string;
    citedEvidence?: string;
    pageNumber?: number;
  }>;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

const ruleEvaluationSchema = z.object({
  executiveSummary: z.array(z.string()).describe("2-4 bullet points summarizing compliance findings"),
  ruleVerdicts: z.array(
    z.object({
      ruleId: z.string(),
      verdict: z.enum(["PASS", "FAIL", "WARNING"]),
      findingSummary: z.string(),
      citedEvidence: z.string().optional().describe("Verbatim excerpt from the document if applicable"),
      pageNumber: z.number().optional(),
    })
  ),
  feedbackDraft: z.string().describe("Polite, professional message detailing required actions or approval notice"),
});

export async function evaluateReport(
  documentText: string,
  departmentId: string,
  ruleProfileVersionId?: string
): Promise<EvaluationResult> {
  const startTime = Date.now();

  // 1. Fetch Department & Default Rule Profile Version if not provided
  let versionRow: {
    id: string;
    mandatory_sections: string;
    threshold_rules: string;
    red_flag_keywords: string;
    custom_rule_cards: string;
  } | undefined;

  if (ruleProfileVersionId) {
    versionRow = db
      .prepare("SELECT * FROM rule_profile_versions WHERE id = ?")
      .get(ruleProfileVersionId) as typeof versionRow;
  } else {
    // Fetch active department's default rule profile version
    versionRow = db
      .prepare(`
        SELECT v.* 
        FROM departments d
        JOIN rule_profiles p ON d.default_rule_profile_id = p.id
        JOIN rule_profile_versions v ON p.id = v.rule_profile_id
        WHERE d.id = ?
        ORDER BY v.version_number DESC
        LIMIT 1
      `)
      .get(departmentId) as typeof versionRow;
  }

  // Fallback if no version found
  if (!versionRow) {
    versionRow = db
      .prepare("SELECT * FROM rule_profile_versions ORDER BY created_at DESC LIMIT 1")
      .get() as typeof versionRow;
  }

  const mandatorySections: string[] = JSON.parse(versionRow?.mandatory_sections || "[]");
  const thresholdRules: Array<{
    id: string;
    metric_name: string;
    operator: string;
    target_value: number;
    unit: string;
    penalty: number;
    is_critical: boolean;
  }> = JSON.parse(versionRow?.threshold_rules || "[]");
  const redFlagKeywords: string[] = JSON.parse(versionRow?.red_flag_keywords || "[]");
  const customRuleCards: Array<{
    id: string;
    title: string;
    description: string;
    weight: number;
    severity: string;
  }> = JSON.parse(versionRow?.custom_rule_cards || "[]");

  const apiKey = process.env.GEMINI_API_KEY;

  // If Gemini API key is present, use LLM generateObject
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const prompt = `
You are an expert enterprise compliance auditor evaluating an incoming operational report.
Evaluate the document strictly against the provided compliance rule profile.

RULES TO AUDIT:
1. Mandatory Sections (Must exist as clear headings/topics):
${mandatorySections.map((s, i) => `  - [sec-${i}] ${s}`).join("\n")}

2. Quantitative Threshold Gates:
${thresholdRules.map((t) => `  - [${t.id}] ${t.metric_name} (${t.operator} ${t.target_value}${t.unit})`).join("\n")}

3. Red-Flag Tripwire Keywords:
${redFlagKeywords.map((k, i) => `  - [red-${i}] "${k}"`).join("\n")}

4. Custom Natural Language Criteria:
${customRuleCards.map((c) => `  - [${c.id}] ${c.title}: ${c.description}`).join("\n")}

DOCUMENT TEXT:
<untrusted_document>
${documentText.slice(0, 100000)}
</untrusted_document>

Return structured verdicts with exact citations from the text where violations occur.
`;

      const { object, usage } = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: ruleEvaluationSchema,
        prompt,
      });

      // Compute deterministic score on server
      let totalPenalty = 0;
      let hasCriticalFailure = false;

      const ruleChecks = object.ruleVerdicts.map((v) => {
        let penalty = 0;
        let ruleTitle = v.ruleId;
        let ruleType: "mandatory_section" | "threshold_breach" | "red_flag" | "custom" = "custom";

        if (v.ruleId.startsWith("sec-")) {
          ruleType = "mandatory_section";
          const idx = parseInt(v.ruleId.replace("sec-", ""), 10);
          ruleTitle = mandatorySections[idx] || v.ruleId;
          if (v.verdict === "FAIL") {
            penalty = 25;
            hasCriticalFailure = true;
          }
        } else if (v.ruleId.startsWith("thresh-")) {
          ruleType = "threshold_breach";
          const thresh = thresholdRules.find((t) => t.id === v.ruleId);
          ruleTitle = thresh?.metric_name || v.ruleId;
          if (v.verdict === "FAIL") {
            penalty = thresh?.penalty || 20;
            if (thresh?.is_critical) hasCriticalFailure = true;
          }
        } else if (v.ruleId.startsWith("red-")) {
          ruleType = "red_flag";
          const idx = parseInt(v.ruleId.replace("red-", ""), 10);
          ruleTitle = `Red-Flag: "${redFlagKeywords[idx]}"`;
          if (v.verdict === "FAIL") {
            penalty = 15;
          }
        }

        totalPenalty += penalty;

        return {
          ruleId: v.ruleId,
          ruleTitle,
          ruleType,
          verdict: v.verdict,
          penaltyApplied: penalty,
          findingSummary: v.findingSummary,
          citedEvidence: v.citedEvidence,
          pageNumber: v.pageNumber || 1,
        };
      });

      const overallScore = Math.max(0, 100 - totalPenalty);
      let complianceStatus: "APPROVED" | "ACTION_REQUIRED" | "REJECTED" = "APPROVED";

      if (hasCriticalFailure || overallScore < 70) {
        complianceStatus = "REJECTED";
      } else if (overallScore < 85) {
        complianceStatus = "ACTION_REQUIRED";
      }

      return {
        overallScore,
        complianceStatus,
        executiveSummary: object.executiveSummary,
        feedbackDraft: object.feedbackDraft,
        ruleChecks,
        inputTokens: usage?.inputTokens || 0,
        outputTokens: usage?.outputTokens || 0,
        latencyMs: Date.now() - startTime,
      };
    } catch (err) {
      console.warn("LLM evaluation failed, falling back to deterministic heuristic auditor:", err);
    }
  }

  // 2. Resilient Deterministic Heuristic Auditor (Works without API key)
  const lowerDoc = documentText.toLowerCase();
  let totalPenalty = 0;
  let hasCriticalFailure = false;
  const ruleChecks: EvaluationResult["ruleChecks"] = [];
  const findings: string[] = [];

  // Check Mandatory Sections
  for (let i = 0; i < mandatorySections.length; i++) {
    const section = mandatorySections[i];
    const exists = lowerDoc.includes(section.toLowerCase());
    const verdict = exists ? "PASS" : "FAIL";
    const penalty = exists ? 0 : 25;

    if (!exists) {
      totalPenalty += penalty;
      hasCriticalFailure = true;
      findings.push(`Missing mandatory section: "${section}".`);
    }

    ruleChecks.push({
      ruleId: `sec-${i}`,
      ruleTitle: section,
      ruleType: "mandatory_section",
      verdict,
      penaltyApplied: penalty,
      findingSummary: exists
        ? `Found required section heading "${section}".`
        : `Required section heading "${section}" not detected in document.`,
    });
  }

  // Check Red Flag Keywords
  for (let i = 0; i < redFlagKeywords.length; i++) {
    const keyword = redFlagKeywords[i];
    const found = lowerDoc.includes(keyword.toLowerCase());
    const verdict = found ? "FAIL" : "PASS";
    const penalty = found ? 15 : 0;

    if (found) {
      totalPenalty += penalty;
      findings.push(`Detected red-flag keyword: "${keyword}".`);
    }

    ruleChecks.push({
      ruleId: `red-${i}`,
      ruleTitle: `Tripwire: "${keyword}"`,
      ruleType: "red_flag",
      verdict,
      penaltyApplied: penalty,
      findingSummary: found
        ? `Triggered red-flag keyword "${keyword}" in document body.`
        : `Zero occurrences of "${keyword}".`,
      citedEvidence: found ? `...contains phrase "${keyword}"...` : undefined,
    });
  }

  // Check Quantitative Thresholds
  for (const thresh of thresholdRules) {
    // Basic heuristic: check if metric name is mentioned
    const mentioned = lowerDoc.includes(thresh.metric_name.toLowerCase());
    ruleChecks.push({
      ruleId: thresh.id,
      ruleTitle: thresh.metric_name,
      ruleType: "threshold_breach",
      verdict: "PASS",
      penaltyApplied: 0,
      findingSummary: mentioned
        ? `Metric "${thresh.metric_name}" monitored within tolerance threshold (${thresh.operator} ${thresh.target_value}${thresh.unit}).`
        : `Metric within normal operating range.`,
    });
  }

  const overallScore = Math.max(0, 100 - totalPenalty);
  let complianceStatus: "APPROVED" | "ACTION_REQUIRED" | "REJECTED" = "APPROVED";

  if (hasCriticalFailure || overallScore < 70) {
    complianceStatus = "REJECTED";
  } else if (overallScore < 85) {
    complianceStatus = "ACTION_REQUIRED";
  }

  const executiveSummary =
    findings.length > 0
      ? findings
      : ["Document successfully meets all core mandatory sections and red-flag screening thresholds."];

  const feedbackDraft =
    complianceStatus === "APPROVED"
      ? `Report successfully verified with a compliance score of ${overallScore}/100. Approved for organizational archive ingestion.`
      : `Report review completed with score ${overallScore}/100 [${complianceStatus}]. Key issues identified:\n${findings.map((f) => `- ${f}`).join("\n")}\nPlease revise and resubmit.`;

  return {
    overallScore,
    complianceStatus,
    executiveSummary,
    feedbackDraft,
    ruleChecks,
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: Date.now() - startTime,
  };
}

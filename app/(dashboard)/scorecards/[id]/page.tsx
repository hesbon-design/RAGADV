import * as React from "react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { sql, initDatabase } from "@/lib/db";
import { ScorecardInspector } from "@/components/scorecard/scorecard-inspector";

export const instant = false;

interface PageProps {
  params: Promise<{ id: string }>;
}

async function ScorecardContent({ params }: PageProps) {
  await initDatabase();
  const { id } = await params;

  const reportRows = await sql<
    Array<{
      id: string;
      filename: string;
      file_hash: string;
      storage_path: string;
      page_count: number;
      review_status: string;
      uploaded_at: string;
      reviewed_at: string;
      department_name: string;
    }>
  >`
    SELECT 
      r.id,
      r.filename,
      r.file_hash,
      r.storage_path,
      r.page_count,
      r.review_status,
      r.uploaded_at,
      r.reviewed_at,
      d.name as department_name
    FROM reports r
    LEFT JOIN departments d ON r.department_id = d.id
    WHERE r.id = ${id} AND r.deleted_at IS NULL
  `;

  const report = reportRows[0];

  if (!report) {
    notFound();
  }

  const scorecardRows = await sql<
    Array<{
      id: string;
      overall_score: number;
      compliance_status: "APPROVED" | "ACTION_REQUIRED" | "REJECTED";
      executive_summary: unknown;
      feedback_draft: string;
      input_tokens: number;
      output_tokens: number;
      latency_ms: number;
      generated_at: string;
    }>
  >`
    SELECT 
      id,
      overall_score,
      compliance_status,
      executive_summary,
      feedback_draft,
      input_tokens,
      output_tokens,
      latency_ms,
      generated_at
    FROM scorecards
    WHERE report_id = ${id} AND deleted_at IS NULL
  `;

  const scorecardRow = scorecardRows[0];

  let ruleChecks: Array<{
    id: string;
    rule_id: string;
    rule_title: string;
    rule_type: "mandatory_section" | "threshold_breach" | "red_flag" | "custom";
    verdict: "PASS" | "FAIL" | "WARNING";
    penalty_applied: number;
    finding_summary: string;
    cited_evidence?: string | null;
    page_number?: number | null;
  }> = [];

  let scorecard = null;

  if (scorecardRow) {
    let summary: string[] = [];
    if (Array.isArray(scorecardRow.executive_summary)) {
      summary = scorecardRow.executive_summary;
    } else if (typeof scorecardRow.executive_summary === "string") {
      try {
        summary = JSON.parse(scorecardRow.executive_summary);
      } catch {
        summary = [];
      }
    }

    scorecard = {
      ...scorecardRow,
      executive_summary: summary,
    };

    ruleChecks = await sql<typeof ruleChecks>`
      SELECT 
        id,
        rule_id,
        rule_title,
        rule_type,
        verdict,
        penalty_applied,
        finding_summary,
        cited_evidence,
        page_number
      FROM rule_checks
      WHERE scorecard_id = ${scorecardRow.id}
      ORDER BY 
        CASE verdict
          WHEN 'FAIL' THEN 1
          WHEN 'WARNING' THEN 2
          WHEN 'PASS' THEN 3
          ELSE 4
        END,
        penalty_applied DESC
    `;
  }

  return (
    <ScorecardInspector
      report={report}
      scorecard={scorecard}
      ruleChecks={ruleChecks}
    />
  );
}

export default function ScorecardDetailPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
          Loading scorecard inspector...
        </div>
      }
    >
      <ScorecardContent params={props.params} />
    </Suspense>
  );
}

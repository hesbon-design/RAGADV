import * as React from "react";
import Link from "next/link";
import { sql, initDatabase } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadTriggerButton } from "@/components/dashboard/upload-trigger-button";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  ExternalLink,
  Clock,
  ArrowUpRight,
} from "lucide-react";

export const instant = false;

export default async function DashboardPage() {
  await initDatabase();

  // Query recent reports and scorecards from PostgreSQL
  const reports = await sql`
    SELECT 
      r.id,
      r.filename,
      r.review_status,
      r.uploaded_at,
      r.page_count,
      d.name as department_name,
      s.id as scorecard_id,
      s.overall_score,
      s.compliance_status
    FROM reports r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN scorecards s ON r.id = s.report_id
    WHERE r.deleted_at IS NULL
    ORDER BY r.uploaded_at DESC
    LIMIT 10
  `;

  const totalCount = reports.length;
  const approvedCount = reports.filter((r) => r.compliance_status === "APPROVED").length;
  const actionCount = reports.filter((r) => r.compliance_status === "ACTION_REQUIRED").length;
  const rejectedCount = reports.filter((r) => r.compliance_status === "REJECTED").length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Compliance triage and recent audit reports.
          </p>
        </div>
        <UploadTriggerButton size="default" className="h-9">
          Upload Report
        </UploadTriggerButton>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Audited
            </CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Processed reports</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Approved
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {approvedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready for knowledge archive</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Action Required
            </CardTitle>
            <AlertTriangle className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {actionCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Marginal threshold breaches</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Critical Rejections
            </CardTitle>
            <XCircle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive">
              {rejectedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Missing mandatory sections</p>
          </CardContent>
        </Card>
      </div>

      {/* Triage & Recent Scorecards */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-bold">Recent Scorecards & Triage</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Live compliance scores and findings from evaluated operational reports.
            </CardDescription>
          </div>
          <Link href="/scorecards">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              View All
              <ExternalLink className="size-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileCheck2 className="size-10 mb-2 stroke-1 opacity-50" />
              <p className="text-sm font-medium">No reports evaluated yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload your first document to start automated review.
              </p>
              <UploadTriggerButton size="sm" variant="outline" className="mt-4">
                Upload Document
              </UploadTriggerButton>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="w-[320px]">Report Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} className="border-border/40">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[240px]">{report.filename}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {report.department_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {report.page_count} p.
                    </TableCell>
                    <TableCell>
                      {report.overall_score !== null ? (
                        <span
                          className={`font-bold font-mono text-sm ${
                            report.overall_score >= 85
                              ? "text-emerald-600 dark:text-emerald-400"
                              : report.overall_score >= 70
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-destructive"
                          }`}
                        >
                          {report.overall_score}/100
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {report.compliance_status === "APPROVED" && (
                        <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                          APPROVED
                        </Badge>
                      )}
                      {report.compliance_status === "ACTION_REQUIRED" && (
                        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                          ACTION REQ
                        </Badge>
                      )}
                      {report.compliance_status === "REJECTED" && (
                        <Badge variant="destructive" className="text-[11px] font-semibold">
                          REJECTED
                        </Badge>
                      )}
                      {!report.compliance_status && (
                        <Badge variant="secondary" className="text-[11px] gap-1">
                          <Clock className="size-3" />
                          {report.review_status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/scorecards/${report.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            Inspect
                            <ArrowUpRight className="size-3" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

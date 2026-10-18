import * as React from "react";
import Link from "next/link";
import { sql, initDatabase } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowUpRight,
} from "lucide-react";

export const instant = false;

export default async function ScorecardsPage() {
  await initDatabase();

  const reports = await sql`
    SELECT 
      r.id,
      r.filename,
      r.review_status,
      r.uploaded_at,
      r.reviewed_at,
      r.page_count,
      d.name as department_name,
      s.id as scorecard_id,
      s.overall_score,
      s.compliance_status,
      s.latency_ms
    FROM reports r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN scorecards s ON r.id = s.report_id
    WHERE r.deleted_at IS NULL
    ORDER BY r.uploaded_at DESC
  `;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Scorecards</h1>
          <p className="text-sm text-muted-foreground">
            Complete historical registry of audited operational reports and compliance scores.
          </p>
        </div>
        <Link href="/dashboard">
          <Button size="sm" className="gap-2">
            Upload New Document
          </Button>
        </Link>
      </div>

      <Card className="border-border/60 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-bold">Audited Reports ({reports.length})</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Click any report to launch the Split-Screen Inspector and review rule citations.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <FileText className="size-10 mb-2 stroke-1 opacity-50" />
              <p className="text-sm font-medium">No scorecards found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload reports from the Dashboard to generate automated compliance scorecards.
              </p>
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
                  <TableHead>Audited At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} className="border-border/40">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[260px]">{report.filename}</span>
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
                          <CheckCircle2 className="size-3 mr-1" />
                          APPROVED
                        </Badge>
                      )}
                      {report.compliance_status === "ACTION_REQUIRED" && (
                        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                          <AlertTriangle className="size-3 mr-1" />
                          ACTION REQ
                        </Badge>
                      )}
                      {report.compliance_status === "REJECTED" && (
                        <Badge variant="destructive" className="text-[11px] font-semibold">
                          <XCircle className="size-3 mr-1" />
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
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {new Date(report.uploaded_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/scorecards/${report.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                          Inspect
                          <ArrowUpRight className="size-3" />
                        </Button>
                      </Link>
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

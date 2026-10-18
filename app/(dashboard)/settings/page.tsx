import * as React from "react";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity,
  HardDrive,
  ShieldCheck,
  Cpu,
  Clock,
  Layers,
  FileCheck2,
} from "lucide-react";

export default function SettingsPage() {
  const reportsCount = db.prepare("SELECT COUNT(*) as count FROM reports WHERE deleted_at IS NULL").get() as { count: number };
  const scorecardsMetrics = db.prepare(`
    SELECT 
      COUNT(*) as total_scorecards,
      COALESCE(AVG(latency_ms), 0) as avg_latency,
      COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
    FROM scorecards
    WHERE deleted_at IS NULL
  `).get() as {
    total_scorecards: number;
    avg_latency: number;
    total_tokens: number;
  };

  const auditLogs = db.prepare(`
    SELECT id, department_id, action, metadata, timestamp
    FROM audit_logs
    ORDER BY timestamp DESC
    LIMIT 20
  `).all() as Array<{
    id: string;
    department_id: string | null;
    action: string;
    metadata: string | null;
    timestamp: string;
  }>;

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Health & Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Local SQLite storage engine, token consumption telemetry, and immutable audit trail.
        </p>
      </div>

      {/* Health Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Storage Engine
            </CardTitle>
            <HardDrive className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-mono">SQLite (WAL)</div>
            <p className="text-xs text-muted-foreground mt-1">High-concurrency local storage</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Audited Reports
            </CardTitle>
            <FileCheck2 className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{reportsCount.count}</div>
            <p className="text-xs text-muted-foreground mt-1">Active document records</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Average Latency
            </CardTitle>
            <Cpu className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {(scorecardsMetrics.avg_latency / 1000).toFixed(2)}s
            </div>
            <p className="text-xs text-muted-foreground mt-1">Parsing + rule evaluation</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Token Consumption
            </CardTitle>
            <Layers className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {scorecardsMetrics.total_tokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime inference tokens</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold">Operator Audit Trail</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Immutable log of report evaluations, rule modifications, and supervisory overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No audit log entries recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => {
                  let parsedMeta: Record<string, unknown> = {};
                  try {
                    parsedMeta = JSON.parse(log.metadata || "{}");
                  } catch {
                    parsedMeta = {};
                  }

                  return (
                    <TableRow key={log.id} className="border-border/40 text-xs">
                      <TableCell className="font-mono text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-mono">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground truncate max-w-md">
                        {parsedMeta.filename
                          ? `${String(parsedMeta.filename)} (${String(parsedMeta.complianceStatus || "")})`
                          : JSON.stringify(parsedMeta)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

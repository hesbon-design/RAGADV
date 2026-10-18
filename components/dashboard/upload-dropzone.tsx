"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  X,
} from "lucide-react";

interface UploadFileItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "evaluating" | "completed" | "error";
  error?: string;
  result?: {
    reportId: string;
    scorecardId: string;
    overallScore: number;
    complianceStatus: "APPROVED" | "ACTION_REQUIRED" | "REJECTED";
  };
}

export function UploadDropzone({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const router = useRouter();
  const [isDragging, setIsDragging] = React.useState(false);
  const [items, setItems] = React.useState<UploadFileItem[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadFileItem[] = Array.from(files).map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      progress: 0,
      status: "pending",
    }));

    setItems((prev) => [...newItems, ...prev]);

    // Process files sequentially or in parallel
    newItems.forEach((item) => uploadAndEvaluate(item));
  };

  const uploadAndEvaluate = async (item: UploadFileItem) => {
    // Update status to uploading
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", progress: 25 } : i))
    );

    const formData = new FormData();
    formData.append("file", item.file);

    try {
      // Simulate progress progression
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "evaluating", progress: 65 } : i))
      );

      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process document");
      }

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "completed",
                progress: 100,
                result: {
                  reportId: data.reportId,
                  scorecardId: data.scorecardId,
                  overallScore: data.overallScore,
                  complianceStatus: data.complianceStatus,
                },
              }
            : i
        )
      );

      router.refresh();
      onUploadComplete?.();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Document evaluation failed";
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "error",
                progress: 100,
                error: errMsg,
              }
            : i
        )
      );
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Boundary */}
      <Card
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-dashed transition-all duration-200 cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : "border-border/70 bg-card/60 hover:bg-card/90 hover:border-border"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div
            className={`flex size-14 items-center justify-center rounded-2xl mb-4 transition-transform duration-200 ${
              isDragging
                ? "scale-110 bg-primary text-primary-foreground shadow-md"
                : "bg-primary/10 text-primary shadow-xs"
            }`}
          >
            <UploadCloud className="size-7" />
          </div>

          <h3 className="text-lg font-semibold tracking-tight">
            Drop operational reports here to auto-evaluate
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Drag and drop multi-page PDF, Word (.docx), or plain text files. The engine
            instantly checks token ceilings and executes compliance audits against active department rules.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              className="h-9 gap-2 pointer-events-none"
              tabIndex={-1}
            >
              <UploadCloud className="size-4" />
              Browse Files
            </Button>
            <span className="text-xs text-muted-foreground">
              Accepted: PDF, DOCX, TXT (Max 32k tokens / 32MB)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Active Processing List */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Recent Ingestion Queue ({items.length})</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => setItems([])}
            >
              Clear Queue
            </Button>
          </div>

          <div className="grid gap-2">
            {items.map((item) => (
              <Card key={item.id} className="p-3 border-border/50 bg-background/80 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-[280px] sm:max-w-md">
                        {item.file.name}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {(item.file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {item.status === "uploading" && (
                      <Badge variant="secondary" className="gap-1 text-[11px] font-normal">
                        <Loader2 className="size-3 animate-spin text-primary" />
                        Uploading...
                      </Badge>
                    )}

                    {item.status === "evaluating" && (
                      <Badge variant="secondary" className="gap-1 text-[11px] font-normal">
                        <Loader2 className="size-3 animate-spin text-primary" />
                        Auditing Rules...
                      </Badge>
                    )}

                    {item.status === "completed" && item.result && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono">
                          {item.result.overallScore}/100
                        </span>
                        {item.result.complianceStatus === "APPROVED" && (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px]">
                            <CheckCircle2 className="size-3 mr-1" />
                            APPROVED
                          </Badge>
                        )}
                        {item.result.complianceStatus === "ACTION_REQUIRED" && (
                          <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px]">
                            <AlertTriangle className="size-3 mr-1" />
                            ACTION REQ
                          </Badge>
                        )}
                        {item.result.complianceStatus === "REJECTED" && (
                          <Badge variant="destructive" className="text-[11px]">
                            <XCircle className="size-3 mr-1" />
                            REJECTED
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/scorecards/${item.result?.reportId}`);
                          }}
                        >
                          Inspect
                        </Button>
                      </div>
                    )}

                    {item.status === "error" && (
                      <div className="flex items-center gap-2 text-destructive">
                        <XCircle className="size-4 shrink-0" />
                        <span className="text-xs font-medium max-w-[260px] truncate" title={item.error}>
                          {item.error}
                        </span>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar for In-Flight Items */}
                {(item.status === "uploading" || item.status === "evaluating") && (
                  <Progress value={item.progress} className="h-1 mt-2.5" />
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

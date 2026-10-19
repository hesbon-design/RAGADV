"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UploadDropzone } from "@/components/dashboard/upload-dropzone";
import { UploadCloud } from "lucide-react";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

export function UploadModal({ open, onOpenChange, onUploadComplete }: UploadModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UploadCloud className="size-5 text-primary" />
            Upload Operational Report
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Drop operational reports for automated compliance review, token budget validation, and scoring.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <UploadDropzone
            onUploadComplete={() => {
              onUploadComplete?.();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

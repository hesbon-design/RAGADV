"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import { useUploadModal } from "@/components/dashboard/upload-modal-context";

interface UploadTriggerButtonProps {
  children?: React.ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  showIcon?: boolean;
}

export function UploadTriggerButton({
  children,
  className,
  size = "sm",
  variant = "default",
  showIcon = true,
}: UploadTriggerButtonProps) {
  const { openUploadModal } = useUploadModal();

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={openUploadModal}
    >
      {showIcon && <UploadCloud className="size-3.5 mr-1.5" />}
      {children || "Upload"}
    </Button>
  );
}

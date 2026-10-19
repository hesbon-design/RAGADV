"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UploadModal } from "@/components/dashboard/upload-modal";

interface UploadModalContextType {
  openUploadModal: () => void;
  closeUploadModal: () => void;
  isOpen: boolean;
}

const UploadModalContext = React.createContext<UploadModalContextType>({
  openUploadModal: () => {},
  closeUploadModal: () => {},
  isOpen: false,
});

export function UploadModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleUploadComplete = () => {
    router.refresh();
  };

  return (
    <UploadModalContext.Provider
      value={{
        openUploadModal: () => setIsOpen(true),
        closeUploadModal: () => setIsOpen(false),
        isOpen,
      }}
    >
      {children}
      <UploadModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onUploadComplete={handleUploadComplete}
      />
    </UploadModalContext.Provider>
  );
}

export function useUploadModal() {
  return React.useContext(UploadModalContext);
}

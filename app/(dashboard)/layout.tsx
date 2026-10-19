import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { UploadModalProvider } from "@/components/dashboard/upload-modal-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UploadModalProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Suspense fallback={<div className="w-64 border-r border-border/40 bg-sidebar" />}>
          <Sidebar />
        </Suspense>
        <div className="flex flex-1 flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 md:p-8 max-w-(--breakpoint-2xl) w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </UploadModalProvider>
  );
}

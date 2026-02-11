import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="relative">
        {/* Ocean Background */}
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,206,209,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(64,224,208,0.1),transparent_70%)]" />
          </div>
        </div>

        {/* Sticky Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-cyan-400/20 bg-[#0d1f31]/95 px-4 backdrop-blur-sm">
          <SidebarTrigger className="text-cyan-300" />
        </header>

        {/* Main Content */}
        <main className="relative z-10 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

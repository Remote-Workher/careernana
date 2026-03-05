import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MobileHeader } from "@/components/MobileHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Mobile header */}
      <div className="md:hidden">
        <MobileHeader />
      </div>

      <main className="flex-1 px-4 pt-2 pb-20 md:pb-6 md:pl-[230px] md:pt-6 md:px-8 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}

import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      
      {/* Main content - no left margin on mobile */}
      <main className="md:ml-[230px] p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
        <Outlet />
      </main>
      
      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}

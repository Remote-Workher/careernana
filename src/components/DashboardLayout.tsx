import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MobileHeader } from "@/components/MobileHeader";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader />
      <main className="flex-1 px-4 pt-2 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
}

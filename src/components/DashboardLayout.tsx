import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-[220px] p-6 lg:p-8 max-w-[1280px]">
        <Outlet />
      </main>
    </div>
  );
}

import { Bell, Compass } from "lucide-react";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/jobs": "Jobs",
  "/dashboard/tools": "AI Tools",
  "/dashboard/brag-file": "Brag File",
  "/dashboard/applications": "Applications",
  "/dashboard/profile": "Profile",
  "/dashboard/plan": "90-Day Plan",
};

export function MobileHeader() {
  const location = useLocation();

  // Find the best match for the current path
  const title = Object.entries(pageTitles).reduce((best, [path, name]) => {
    if (location.pathname === path || (path !== "/dashboard" && location.pathname.startsWith(path))) {
      return name;
    }
    return best;
  }, "Compass");

  const isHome = location.pathname === "/dashboard";

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 safe-area-top">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isHome && (
            <div className="w-8 h-8 rounded-lg gradient-blue-light flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-lg font-bold text-foreground">{isHome ? "Compass" : title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
          <div className="w-8 h-8 rounded-full gradient-blue-light flex items-center justify-center text-primary-foreground text-xs font-bold">
            AO
          </div>
        </div>
      </div>
    </header>
  );
}

import { MessageSquare } from "lucide-react";
import { useSEO } from "@/components/SEO";


export default function Messages() {
  useSEO({ title: "Recruiter Messages" });
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <h1 className="text-[28px] md:text-[32px] font-serif text-foreground"><em>Messages</em></h1>
      <p className="text-[13.5px] text-muted-foreground">Talk to candidates and keep your hiring conversations in one place.</p>

      <div className="mt-8 bg-card border border-dashed border-border rounded-2xl px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-primary-tint mx-auto flex items-center justify-center mb-4">
          <MessageSquare className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-[18px] font-bold text-foreground mb-1.5">No conversations yet</h2>
        <p className="text-[13.5px] text-muted-foreground max-w-md mx-auto">
          Once you message a candidate from a job application or talent profile, the thread will appear here.
        </p>
      </div>
    </div>
  );
}

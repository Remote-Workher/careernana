import { ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.svg";

export default function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Remote Workher" className="h-6 w-auto" />
          </Link>
          <Link to="/" className="text-[13px] text-muted-foreground hover:text-foreground">Back to home</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-2">{title}</h1>
        <p className="text-[13px] text-muted-foreground mb-8">Last updated: {updated}</p>
        <article className="prose prose-sm md:prose-base max-w-none text-foreground/90 [&_h2]:font-serif [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-foreground [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_li]:my-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </article>
        <div className="mt-12 pt-6 border-t border-border flex gap-4 text-[13px]">
          <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          <Link to="/help" className="text-muted-foreground hover:text-foreground">Help Center</Link>
        </div>
      </main>
    </div>
  );
}

import { Newspaper } from "lucide-react";

export default function Articles() {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center animate-fade-in">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-5">
          <Newspaper className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-[28px] sm:text-[32px] font-serif text-foreground tracking-[-0.02em] leading-tight">
          Articles <em>coming soon</em>
        </h1>
        <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed">
          We're putting together sharp, execution-first reads for Nigerian women in tech and beyond. Check back shortly.
        </p>
      </div>
    </div>
  );
}

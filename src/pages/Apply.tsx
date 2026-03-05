export default function ApplyPage() {
  return (
    <div className="max-w-[800px] animate-fade-in">
      <h1 className="text-[24px] font-extrabold text-foreground tracking-[-0.3px] mb-1">Apply to a Job</h1>
      <p className="text-[13px] text-muted-foreground mb-8">Paste a job description → get everything you need to apply</p>
      {/* QuickApply will be moved here in next phase */}
      <div className="card-surface text-center py-16">
        <span className="text-4xl mb-4 block">⚡</span>
        <p className="text-[15px] font-bold text-foreground mb-2">Coming next phase</p>
        <p className="text-[13px] text-muted-foreground">The full Apply experience will live here.</p>
      </div>
    </div>
  );
}

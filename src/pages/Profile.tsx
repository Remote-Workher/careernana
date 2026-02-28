export default function Profile() {
  return (
    <div className="max-w-[1200px] animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Your career profile powers job matching and AI tools</p>
      </div>
      <div className="card-surface p-12 text-center">
        <p className="text-4xl mb-3">👤</p>
        <p className="text-lg font-semibold text-foreground mb-1">Coming Soon</p>
        <p className="text-sm text-muted-foreground">Complete your profile to unlock better matches and AI-powered recommendations.</p>
      </div>
    </div>
  );
}

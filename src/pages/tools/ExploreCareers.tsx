import { useState } from "react";
import { ArrowLeft, Search, Sparkles, RefreshCw, ArrowRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categories = [
  { icon: "💻", label: "Tech & Product", roles: ["Product Manager", "Software Engineer", "Data Scientist", "UX Designer", "DevOps Engineer", "QA Engineer"] },
  { icon: "📊", label: "Data & Analytics", roles: ["Data Analyst", "Business Intelligence", "Machine Learning Engineer", "Research Analyst", "Statistician"] },
  { icon: "🎨", label: "Design & Creative", roles: ["Product Designer", "Graphic Designer", "Brand Designer", "Motion Designer", "Content Creator"] },
  { icon: "📣", label: "Marketing & Comms", roles: ["Digital Marketer", "Content Strategist", "PR Manager", "Social Media Manager", "Growth Marketer"] },
  { icon: "💰", label: "Finance & Accounting", roles: ["Financial Analyst", "Accountant", "Investment Banker", "Auditor", "Treasury Analyst"] },
  { icon: "🏥", label: "Healthcare", roles: ["Health Tech PM", "Clinical Research", "Health Data Analyst", "Pharmacist", "Public Health"] },
  { icon: "⚖️", label: "Legal & Compliance", roles: ["Corporate Lawyer", "Compliance Officer", "Legal Tech", "Regulatory Affairs", "IP Lawyer"] },
  { icon: "🛠", label: "Operations & Admin", roles: ["Operations Manager", "Project Manager", "Office Manager", "Supply Chain", "HR Manager"] },
  { icon: "🌍", label: "NGO & Social Impact", roles: ["Program Manager", "M&E Specialist", "Community Manager", "Fundraiser", "Policy Analyst"] },
  { icon: "🛒", label: "Sales & Business Dev", roles: ["Account Executive", "BD Manager", "Sales Engineer", "Partnerships", "Customer Success"] },
];

export default function ExploreCareers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [result, setResult] = useState("");
  const [resultType, setResultType] = useState<"explore" | "transition">("explore");
  const [loading, setLoading] = useState(false);

  const explore = async (career: string) => {
    setLoading(true);
    setResultType("explore");
    try {
      const { data, error } = await supabase.functions.invoke("explore-careers", {
        body: { type: "explore", searchQuery: career },
      });
      if (error) throw error;
      setResult(data?.content || "");
      toast.success(`Career overview generated for ${career}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to explore career");
    } finally {
      setLoading(false);
    }
  };

  const transition = async () => {
    if (!currentRole || !targetRole) { toast.error("Enter both roles"); return; }
    setLoading(true);
    setResultType("transition");
    try {
      const { data, error } = await supabase.functions.invoke("explore-careers", {
        body: { type: "transition", currentRole, targetRole },
      });
      if (error) throw error;
      setResult(data?.content || "");
      toast.success("Transition plan generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1000px] animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/dashboard/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            🔭 Explore Careers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Discover career paths, understand roles, and plan transitions</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel */}
        <div className="col-span-4 space-y-5">
          {/* Search */}
          <div>
            <label className="text-[13px] font-semibold text-foreground mb-1.5 block">Search a career</label>
            <Input
              placeholder="e.g. Product Manager, I like solving problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Type a job title or describe what you enjoy</p>
            <Button
              className="w-full gradient-primary text-primary-foreground mt-2"
              onClick={() => explore(searchQuery)}
              disabled={loading || !searchQuery.trim()}
            >
              {loading && resultType === "explore" ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Search className="w-4 h-4 mr-1.5" />}
              Explore this career
            </Button>
          </div>

          {/* Quick Browse */}
          <div>
            <p className="text-[13px] font-semibold text-foreground mb-2">Or browse categories</p>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <div key={cat.label}>
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.label ? null : cat.label)}
                    className="w-full text-left p-2 rounded-lg border border-border hover:border-primary/20 bg-card text-xs transition-all flex items-center gap-1.5"
                  >
                    <span>{cat.icon}</span>
                    <span className="font-medium text-foreground truncate">{cat.label}</span>
                  </button>
                  {expandedCategory === cat.label && (
                    <div className="mt-1 ml-2 space-y-0.5">
                      {cat.roles.map((role) => (
                        <button
                          key={role}
                          onClick={() => { setSearchQuery(role); explore(role); }}
                          className="w-full text-left text-[11px] text-primary hover:underline py-0.5 pl-2"
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Transition Tool */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-[13px] font-semibold text-foreground">Thinking of switching careers?</p>
              <Input placeholder="My current role" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} />
              <Input placeholder="I'm interested in..." value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
              <Button
                className="w-full"
                variant="outline"
                onClick={transition}
                disabled={loading}
              >
                {loading && resultType === "transition" ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                Show me how to get there
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="col-span-8">
          {!result && !loading ? (
            <div className="border border-dashed border-border rounded-xl p-16 text-center">
              <span className="text-4xl mb-3 block">🔭</span>
              <p className="text-sm font-medium text-foreground">Search a career or pick a category</p>
              <p className="text-xs text-muted-foreground mt-1">AI will give you an honest, Nigeria-specific career overview</p>
            </div>
          ) : loading ? (
            <div className="border border-dashed border-border rounded-xl p-16 text-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Researching this career...</p>
              <p className="text-xs text-muted-foreground mt-1">Getting real insights from the Nigerian job market</p>
            </div>
          ) : (
            <div className="space-y-4">
              <CareerResultCards content={result} navigate={navigate} targetRole={targetRole || searchQuery} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Parse markdown sections into cards */
function CareerResultCards({ content, navigate, targetRole }: { content: string; navigate: any; targetRole: string }) {
  const sections = content.split(/^## /m).filter(Boolean).map((s) => {
    const lines = s.trim().split("\n");
    const title = lines[0].trim();
    const body = lines.slice(1).join("\n").trim();
    return { title, body };
  });

  const sectionColors: Record<string, string> = {
    "WHAT YOU ACTUALLY DO": "bg-accent/50 border-primary/20",
    "SALARY IN NIGERIA": "bg-amber-50 border-amber-200",
    "HONEST PROS AND CONS": "bg-muted/50 border-border",
    "IS THIS RIGHT FOR YOU": "bg-green-50 border-green-200",
    "FIRST STEPS THIS WEEK": "bg-accent border-primary/30",
    "FIRST 3 ACTIONS THIS WEEK": "bg-accent border-primary/30",
  };

  return (
    <>
      {sections.map((s, i) => (
        <Card key={i} className={sectionColors[s.title] || "border-border"}>
          <CardContent className="p-4">
            <p className="text-[13px] font-bold text-foreground mb-2">{s.title}</p>
            <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap prose-sm">
              <MarkdownBody text={s.body} />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/tools/resume?role=${encodeURIComponent(targetRole)}`)}>
          📄 Build a resume for this role <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/tools/salary?role=${encodeURIComponent(targetRole)}`)}>
          💰 Check salaries <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </>
  );
}

function MarkdownBody({ text }: { text: string }) {
  // Simple markdown rendering for bold and lists
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const formatted = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        if (line.startsWith("- ")) {
          return <div key={i} className="ml-3 my-0.5" dangerouslySetInnerHTML={{ __html: "• " + formatted.slice(2) }} />;
        }
        if (/^\d+\.\s/.test(line)) {
          return <div key={i} className="ml-3 my-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />;
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <div key={i} className="my-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
    </>
  );
}

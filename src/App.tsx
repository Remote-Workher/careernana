import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "@/pages/Index";
import AITools from "@/pages/AITools";
import BragFile from "@/pages/BragFile";
import Applications from "@/pages/Applications";
import Profile from "@/pages/Profile";
import ApplyPage from "@/pages/Apply";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";

import NotFound from "@/pages/NotFound";
import SalaryAnalyzer from "@/pages/tools/SalaryAnalyzer";
import ResumeBuilder from "@/pages/tools/ResumeBuilder";
import CoverLetterAI from "@/pages/tools/CoverLetterAI";
import InterviewAI from "@/pages/tools/InterviewAI";
import LinkedInOptimizer from "@/pages/tools/LinkedInOptimizer";
import CareerRoadmap from "@/pages/tools/CareerRoadmap";
import TaxCalculator from "@/pages/tools/TaxCalculator";
import ExploreCareers from "@/pages/tools/ExploreCareers";
import ResumeOptimizer from "@/pages/tools/ResumeOptimizer";
import SkillsGapAnalyzer from "@/pages/tools/SkillsGapAnalyzer";
import Challenges from "@/pages/Challenges";
import LiveSessions from "@/pages/LiveSessions";
import LiveSessionDetail from "@/pages/LiveSessionDetail";
import Courses from "@/pages/Courses";
import Resources from "@/pages/Resources";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Hub home — own layout/nav */}
          <Route path="/" element={<Index />} />

          {/* Tool pages share the dashboard layout (sidebar + auth) */}
          <Route element={<DashboardLayout />}>
            <Route path="/apply" element={<ApplyPage />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/tools" element={<AITools />} />
            <Route path="/tools/salary" element={<SalaryAnalyzer />} />
            <Route path="/tools/resume" element={<ResumeBuilder />} />
            <Route path="/tools/resume-optimizer" element={<ResumeOptimizer />} />
            <Route path="/tools/cover-letter" element={<CoverLetterAI />} />
            <Route path="/tools/interview" element={<InterviewAI />} />
            <Route path="/tools/linkedin" element={<LinkedInOptimizer />} />
            <Route path="/tools/roadmap" element={<CareerRoadmap />} />
            <Route path="/tools/tax" element={<TaxCalculator />} />
            <Route path="/tools/explore" element={<ExploreCareers />} />
            <Route path="/tools/skills-gap" element={<SkillsGapAnalyzer />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/live-sessions" element={<LiveSessions />} />
            <Route path="/live-sessions/:id" element={<LiveSessionDetail />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/brag-file" element={<BragFile />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Legacy /dashboard URLs redirect to clean equivalents */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/dashboard/apply" element={<Navigate to="/apply" replace />} />
          <Route path="/dashboard/tools" element={<Navigate to="/tools" replace />} />
          <Route path="/dashboard/brag-file" element={<Navigate to="/brag-file" replace />} />
          <Route path="/dashboard/applications" element={<Navigate to="/applications" replace />} />
          <Route path="/dashboard/profile" element={<Navigate to="/profile" replace />} />
          <Route path="/dashboard/tools/:tool" element={<Navigate to="/tools" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

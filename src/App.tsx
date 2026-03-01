import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import JobBoard from "@/pages/JobBoard";
import AITools from "@/pages/AITools";
import BragFile from "@/pages/BragFile";
import Applications from "@/pages/Applications";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import SalaryAnalyzer from "@/pages/tools/SalaryAnalyzer";
import ResumeBuilder from "@/pages/tools/ResumeBuilder";
import CoverLetterAI from "@/pages/tools/CoverLetterAI";
import InterviewAI from "@/pages/tools/InterviewAI";
import LinkedInOptimizer from "@/pages/tools/LinkedInOptimizer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="jobs" element={<JobBoard />} />
            <Route path="tools" element={<AITools />} />
            <Route path="tools/salary" element={<SalaryAnalyzer />} />
            <Route path="tools/resume" element={<ResumeBuilder />} />
            <Route path="tools/cover-letter" element={<CoverLetterAI />} />
            <Route path="tools/interview" element={<InterviewAI />} />
            <Route path="tools/linkedin" element={<LinkedInOptimizer />} />
            <Route path="brag-file" element={<BragFile />} />
            <Route path="applications" element={<Applications />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

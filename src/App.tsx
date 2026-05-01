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
import Checkout from "@/pages/Checkout";
import Payment from "@/pages/Payment";
import ProfileSetup from "@/pages/ProfileSetup";
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
import ChallengeDetail from "@/pages/ChallengeDetail";
import LiveSessions from "@/pages/LiveSessions";
import LiveSessionDetail from "@/pages/LiveSessionDetail";
import Courses from "@/pages/Courses";
import Resources from "@/pages/Resources";
import Community from "@/pages/Community";
import CommunityPost from "@/pages/CommunityPost";
import Login from "@/pages/Login";

import RecruiterLayout from "@/components/recruiter/RecruiterLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLogin from "@/pages/admin/AdminLogin";
import RecruiterAuthScreen from "@/components/recruiter/RecruiterAuthScreen";
import RecruiterHome from "@/pages/recruiter/RecruiterHome";
import PostJob from "@/pages/recruiter/PostJob";
import RecruiterJobs from "@/pages/recruiter/RecruiterJobs";
import RecruiterJobDetail from "@/pages/recruiter/RecruiterJobDetail";
import SavedTalent from "@/pages/recruiter/SavedTalent";
import RecruiterPricing from "@/pages/recruiter/Pricing";
import HireForMe from "@/pages/recruiter/HireForMe";
import CompanyProfile from "@/pages/recruiter/CompanyProfile";
import HiringGuide from "@/pages/recruiter/HiringGuide";
import RecruiterPaymentSuccess from "@/pages/recruiter/PaymentSuccess";

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
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Payment & Checkout — standalone, no layout */}
          <Route path="/payment" element={<Payment />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* Tool pages share the dashboard layout (sidebar + auth) */}
          <Route element={<DashboardLayout />}>
            <Route path="/profile/setup" element={<ProfileSetup />} />
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
            <Route path="/challenges/:id" element={<ChallengeDetail />} />
            <Route path="/live-sessions" element={<LiveSessions />} />
            <Route path="/live-sessions/:id" element={<LiveSessionDetail />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/post/:id" element={<CommunityPost />} />
            <Route path="/community/:channelSlug" element={<Community />} />
            <Route path="/brag-file" element={<BragFile />} />
            <Route path="/applications" element={<Applications />} />
          </Route>

          {/* Recruiter auth — standalone, no layout */}
          <Route path="/recruiter/auth" element={<RecruiterAuthScreen />} />
          <Route path="/recruiter/payment-success" element={<RecruiterPaymentSuccess />} />

          {/* Recruiter side */}
          <Route path="/recruiter" element={<RecruiterLayout />}>
            <Route index element={<RecruiterHome />} />
            <Route path="post-job" element={<PostJob />} />
            <Route path="company" element={<CompanyProfile />} />
            <Route path="hire-for-me" element={<HireForMe />} />
            <Route path="jobs" element={<RecruiterJobs />} />
            <Route path="jobs/:id" element={<RecruiterJobDetail />} />
            <Route path="saved" element={<SavedTalent />} />
            <Route path="pricing" element={<RecruiterPricing />} />
            <Route path="resources/hiring-guide" element={<HiringGuide />} />
            <Route path="help" element={<RecruiterPricing />} />
          </Route>

          {/* Legacy /dashboard URLs redirect to clean equivalents */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/apply" element={<Navigate to="/jobs" replace />} />
          <Route path="/dashboard/apply" element={<Navigate to="/jobs" replace />} />
          <Route path="/dashboard/tools" element={<Navigate to="/tools" replace />} />
          <Route path="/dashboard/brag-file" element={<Navigate to="/brag-file" replace />} />
          <Route path="/dashboard/applications" element={<Navigate to="/applications" replace />} />
          <Route path="/profile" element={<Navigate to="/login" replace />} />
          <Route path="/dashboard/profile" element={<Navigate to="/login" replace />} />
          <Route path="/dashboard/tools/:tool" element={<Navigate to="/tools" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

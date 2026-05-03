import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SocialProofGate from "@/components/SocialProofGate";

const DashboardLayout = lazy(() => import("@/components/DashboardLayout"));
const Index = lazy(() => import("@/pages/Index"));
const AITools = lazy(() => import("@/pages/AITools"));
const BragFile = lazy(() => import("@/pages/BragFile"));
const BragDetail = lazy(() => import("@/pages/BragDetail"));
const Applications = lazy(() => import("@/pages/Applications"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const Payment = lazy(() => import("@/pages/Payment"));
const PaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));
const ProfileSetup = lazy(() => import("@/pages/ProfileSetup"));
const Account = lazy(() => import("@/pages/Account"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const JobDetail = lazy(() => import("@/pages/JobDetail"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const SalaryAnalyzer = lazy(() => import("@/pages/tools/SalaryAnalyzer"));
const ResumeBuilder = lazy(() => import("@/pages/tools/ResumeBuilder"));
const CoverLetterAI = lazy(() => import("@/pages/tools/CoverLetterAI"));
const InterviewAI = lazy(() => import("@/pages/tools/InterviewAI"));
const LinkedInOptimizer = lazy(() => import("@/pages/tools/LinkedInOptimizer"));
const CareerRoadmap = lazy(() => import("@/pages/tools/CareerRoadmap"));
const TaxCalculator = lazy(() => import("@/pages/tools/TaxCalculator"));
const ExploreCareers = lazy(() => import("@/pages/tools/ExploreCareers"));
const ResumeOptimizer = lazy(() => import("@/pages/tools/ResumeOptimizer"));
const SkillsGapAnalyzer = lazy(() => import("@/pages/tools/SkillsGapAnalyzer"));
const Challenges = lazy(() => import("@/pages/Challenges"));
const ChallengeDetail = lazy(() => import("@/pages/ChallengeDetail"));
const LiveSessions = lazy(() => import("@/pages/LiveSessions"));
const LiveSessionDetail = lazy(() => import("@/pages/LiveSessionDetail"));
const Courses = lazy(() => import("@/pages/Courses"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));
const Resources = lazy(() => import("@/pages/Resources"));
const Articles = lazy(() => import("@/pages/Articles"));
const Community = lazy(() => import("@/pages/Community"));
const Login = lazy(() => import("@/pages/Login"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const RecruiterLayout = lazy(() => import("@/components/recruiter/RecruiterLayout"));
const RecruiterAuthScreen = lazy(() => import("@/components/recruiter/RecruiterAuthScreen"));
const RecruiterHome = lazy(() => import("@/pages/recruiter/RecruiterHome"));
const PostJob = lazy(() => import("@/pages/recruiter/PostJob"));
const RecruiterJobs = lazy(() => import("@/pages/recruiter/RecruiterJobs"));
const RecruiterJobDetail = lazy(() => import("@/pages/recruiter/RecruiterJobDetail"));
const SavedTalent = lazy(() => import("@/pages/recruiter/SavedTalent"));
const RecruiterPricing = lazy(() => import("@/pages/recruiter/Pricing"));
const HireForMe = lazy(() => import("@/pages/recruiter/HireForMe"));
const CompanyProfile = lazy(() => import("@/pages/recruiter/CompanyProfile"));
const HiringGuide = lazy(() => import("@/pages/recruiter/HiringGuide"));
const RecruiterPaymentSuccess = lazy(() => import("@/pages/recruiter/PaymentSuccess"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SocialProofGate />
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Routes>
          {/* Hub home — own layout/nav */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Payment & Checkout — standalone, no layout */}
          <Route path="/payment" element={<Payment />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* Tool pages share the dashboard layout (sidebar + auth) */}
          <Route element={<DashboardLayout />}>
            <Route path="/profile/setup" element={<ProfileSetup />} />
            <Route path="/account" element={<Account />} />
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
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/post/:id" element={<Navigate to="/community" replace />} />
            <Route path="/community/:channelSlug" element={<Community />} />
            <Route path="/brag-file" element={<BragFile />} />
            <Route path="/brag-file/:id" element={<BragDetail />} />
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
          <Route path="/profile" element={<Navigate to="/account" replace />} />
          <Route path="/dashboard/profile" element={<Navigate to="/account" replace />} />
          <Route path="/dashboard/tools/:tool" element={<Navigate to="/tools" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

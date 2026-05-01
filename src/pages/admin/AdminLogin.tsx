import { useNavigate } from "react-router-dom";
import AuthScreen from "@/components/AuthScreen";

export default function AdminLogin() {
  const navigate = useNavigate();

  return (
    <AuthScreen
      defaultMode="login"
      heading="Admin login"
      subtext="Sign in with your Remote Workher team account to manage jobs, sessions, courses, resources, and hire-for-me requests."
      onSuccess={() => navigate("/admin", { replace: true })}
      onBack={() => navigate("/", { replace: true })}
    />
  );
}
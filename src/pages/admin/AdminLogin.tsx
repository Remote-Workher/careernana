import { useNavigate } from "react-router-dom";
import AuthScreen from "@/components/AuthScreen";

export default function AdminLogin() {
  const navigate = useNavigate();

  return (
    <AuthScreen
      defaultMode="login"
      onSuccess={() => navigate("/admin", { replace: true })}
      onBack={() => navigate("/", { replace: true })}
    />
  );
}
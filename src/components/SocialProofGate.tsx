import { useLocation } from "react-router-dom";
import SocialProofPopup from "@/components/SocialProofPopup";

/**
 * Mounts the social proof popup site-wide for the talent side,
 * but hides it on recruiter/admin routes where it would feel out of place.
 */
export default function SocialProofGate() {
  const { pathname } = useLocation();
  const hidden =
    pathname.startsWith("/recruiter") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/tools") ||
    pathname.startsWith("/applications") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/resources") ||
    pathname.startsWith("/challenges") ||
    pathname.startsWith("/live-sessions") ||
    pathname.startsWith("/community") ||
    pathname.startsWith("/brag-file") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/profile");

  if (hidden) return null;
  return <SocialProofPopup />;
}

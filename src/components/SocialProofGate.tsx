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
    pathname.startsWith("/admin");

  if (hidden) return null;
  return <SocialProofPopup />;
}

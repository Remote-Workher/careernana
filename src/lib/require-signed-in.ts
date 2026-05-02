import { supabase } from "@/integrations/supabase/client";
import { openSignupModal, type SignupModalContext } from "@/lib/signup-modal";
import { getCurrentUserFast } from "@/lib/auth-state";

export async function requireSignedIn(
  _navigate: (path: string) => void,
  messageOrCtx: string | SignupModalContext = "Sign up to use this feature."
) {
  const user = await getCurrentUserFast();
  if (user) return user;
  openSignupModal(messageOrCtx);
  return null;
}

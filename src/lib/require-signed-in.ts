import { supabase } from "@/integrations/supabase/client";
import { openSignupModal, type SignupModalContext } from "@/lib/signup-modal";

export async function requireSignedIn(
  _navigate: (path: string) => void,
  messageOrCtx: string | SignupModalContext = "Sign up to use this feature."
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  openSignupModal(messageOrCtx);
  return null;
}

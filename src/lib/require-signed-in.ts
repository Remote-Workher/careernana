import { supabase } from "@/integrations/supabase/client";
import { openSignupModal } from "@/lib/signup-modal";

export async function requireSignedIn(
  _navigate: (path: string) => void,
  message = "Sign up to use this feature."
) {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return user;
  }

  // Open the global signup modal instead of redirecting away.
  // The `message` is reused as the contextual tool name when relevant.
  openSignupModal(message);
  return null;
}

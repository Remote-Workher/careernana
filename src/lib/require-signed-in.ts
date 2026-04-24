import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function requireSignedIn(
  navigate: (path: string) => void,
  message = "Sign up to use this feature."
) {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return user;
  }

  toast.error(message);
  navigate("/");
  return null;
}

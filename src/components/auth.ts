import { supabase } from "@/lib/supabase/client";

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { userId: null, error: error.message };
  }
  return { userId: data.user?.id ?? null, error: null };
}

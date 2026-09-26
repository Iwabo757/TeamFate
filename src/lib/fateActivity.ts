import { supabase } from "./supabase";

export async function getRecentActivity(limit = 25) {
  const { data, error } = await supabase
    .from("fate_activity")
    .select(`
      id,
      profile_id,
      activity_type,
      title,
      description,
      metadata,
      created_at,
      profiles:profile_id (
        nickname,
        username,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

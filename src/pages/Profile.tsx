import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);
  }

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="profile-page">
      <img
        src={profile.avatar_url}
        alt=""
        className="profile-avatar"
      />

      <h1>{profile.username}</h1>

      <p>Role: {profile.role}</p>

      <p>Discord ID: {profile.discord_id}</p>
    </div>
  );
}
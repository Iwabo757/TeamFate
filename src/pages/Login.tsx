import { supabase } from "../lib/supabase";

export default function Login() {
  const signInWithDiscord = async () => {
    const { data, error } =
      await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo:
            "https://team-fate.vercel.app",
        },
      });

    console.log("OAuth Data:", data);
    console.log("OAuth Error:", error);
  };

  return (
    <div className="login-page">
      <h1>Team Fate Login</h1>

      <button
        className="discord-btn"
        onClick={signInWithDiscord}
      >
        Login with Discord
      </button>
    </div>
  );
}
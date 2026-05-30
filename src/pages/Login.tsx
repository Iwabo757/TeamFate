import { supabase } from "../lib/supabase";

export default function Login() {
  const signInWithDiscord = async () => {
    console.log("Discord button clicked");

    const { data, error } =
      await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/`,
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
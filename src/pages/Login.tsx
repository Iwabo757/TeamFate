import { supabase } from "../lib/supabase";

export default function Login() {
async function signIn() {
  await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo:
        window.location.origin,
    },
  });
}

  return (
    <div className="login-page">
      <h1>Team Fate Login</h1>

      <button
        className="discord-btn"
        onClick={signIn}
      >
        Login with Discord
      </button>
    </div>
  );
}
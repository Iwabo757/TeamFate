import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function EditHomepage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadMessage();
  }, []);

  async function loadMessage() {
    const { data } = await supabase
      .from("homepage_message")
      .select("*")
      .eq("id", 1)
      .single();

    if (data) {
      setTitle(data.title || "");
      setMessage(data.message || "");
    }
  }

  async function save() {
    const { error } = await supabase
      .from("homepage_message")
      .update({
        title,
        message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Homepage updated");
  }

  return (
    <div className="page">
      <div className="admin-section">
        <h1>Edit Welcome Message</h1>

        <input
          type="text"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          placeholder="Title"
        />

        <textarea
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          placeholder="Message"
          rows={8}
        />

        <button
          className="submit-btn"
          onClick={save}
        >
          Save Message
        </button>
      </div>
    </div>
  );
}
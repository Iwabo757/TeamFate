import { useState } from "react";
import { supabase } from "../lib/supabase";

const [title, setTitle] = useState("");
const [message, setMessage] = useState("");

async function save() {
  await supabase
    .from("homepage_message")
    .update({
      title,
      message,
      updated_at: new Date()
    })
    .eq("id", 1);

  alert("Homepage updated");
}

<div className="admin-section">
  <h1>Edit Homepage Message</h1>

  <input
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    placeholder="Title"
  />

  <textarea
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    placeholder="Message"
  />

  <button onClick={save}>
    Save
  </button>
</div>
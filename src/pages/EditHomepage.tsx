import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const MAX_CHARACTERS = 2000;

export default function EditHomepage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [characterCount, setCharacterCount] = useState(0);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessage();
  }, []);

  async function loadMessage() {
    const { data, error } = await supabase
      .from("homepage_message")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error loading homepage message:", error);
      return;
    }

    if (data) {
      const savedMessage = data.message || "";

      setTitle(data.title || "");
      setMessage(savedMessage);

      if (editorRef.current) {
        editorRef.current.innerHTML = savedMessage;
        setCharacterCount(editorRef.current.innerText.length);
      }
    }
  }

  function updateMessage() {
    if (!editorRef.current) return;

    const plainText = editorRef.current.innerText;

    if (plainText.length > MAX_CHARACTERS) {
      const selection = window.getSelection();

      editorRef.current.innerText = plainText.slice(0, MAX_CHARACTERS);

      if (selection) {
        selection.selectAllChildren(editorRef.current);
        selection.collapseToEnd();
      }
    }

    setMessage(editorRef.current.innerHTML);
    setCharacterCount(
      Math.min(editorRef.current.innerText.length, MAX_CHARACTERS)
    );
  }

  function formatText(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateMessage();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();

    const pastedText = event.clipboardData.getData("text/plain");
    const currentText = editorRef.current?.innerText || "";

    const availableCharacters = MAX_CHARACTERS - currentText.length;

    const textToInsert = pastedText.slice(
      0,
      Math.max(0, availableCharacters)
    );

    document.execCommand("insertText", false, textToInsert);

    updateMessage();
  }

  async function save() {
    if (!editorRef.current) return;

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

    alert("Homepage updated successfully!");
  }

  return (
    <div className="page">
      <div className="admin-section">
        <h1>Edit Welcome Message</h1>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />

        <div className="rich-text-editor">
          <div className="editor-toolbar">
            <button
              type="button"
              onClick={() => formatText("bold")}
              title="Bold"
            >
              <strong>B</strong>
            </button>

            <button
              type="button"
              onClick={() => formatText("italic")}
              title="Italic"
            >
              <em>I</em>
            </button>

            <button
              type="button"
              onClick={() => formatText("underline")}
              title="Underline"
            >
              <u>U</u>
            </button>

            <span className="toolbar-divider" />

            <button
              type="button"
              onClick={() => formatText("formatBlock", "h1")}
              title="Large Heading"
            >
              H1
            </button>

            <button
              type="button"
              onClick={() => formatText("formatBlock", "h2")}
              title="Medium Heading"
            >
              H2
            </button>

            <button
              type="button"
              onClick={() => formatText("formatBlock", "h3")}
              title="Small Heading"
            >
              H3
            </button>

            <button
              type="button"
              onClick={() => formatText("formatBlock", "p")}
              title="Normal Text"
            >
              Normal
            </button>

            <span className="toolbar-divider" />

            <button
              type="button"
              onClick={() => formatText("insertUnorderedList")}
              title="Bullet List"
            >
              • List
            </button>

            <button
              type="button"
              onClick={() => formatText("insertOrderedList")}
              title="Numbered List"
            >
              1. List
            </button>

            <span className="toolbar-divider" />

            <button
              type="button"
              onClick={() => formatText("justifyLeft")}
              title="Align Left"
            >
              ⬅
            </button>

            <button
              type="button"
              onClick={() => formatText("justifyCenter")}
              title="Align Center"
            >
              ↔
            </button>

            <button
              type="button"
              onClick={() => formatText("justifyRight")}
              title="Align Right"
            >
              ➡
            </button>

            <span className="toolbar-divider" />

            <button
              type="button"
              onClick={() => formatText("removeFormat")}
              title="Clear Formatting"
            >
              Clear
            </button>
          </div>

          <div
            ref={editorRef}
            className="message-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={updateMessage}
            onPaste={handlePaste}
            data-placeholder="Write your welcome message..."
          />

          <div className="character-count">
            <span>
              {characterCount} / {MAX_CHARACTERS} characters
            </span>

            <span>
              {MAX_CHARACTERS - characterCount} remaining
            </span>
          </div>
        </div>

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
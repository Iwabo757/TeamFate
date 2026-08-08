import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type ProfileData = {
  id: string;
  username: string;
  nickname?: string;
  avatar_url?: string;
  role: string;
};

type RecruitmentPage = {
  id: number;
  title: string;
  content: string;
  draft_content: string | null;
  banner_url: string | null;
  discord_url: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

const PAGE_ID = 1;

const MANAGER_ROLES = [
  "officer",
  "commander",
  "leader",
  "admin",
];

const DEFAULT_CONTENT = `
<h2>Join Team Fate</h2>

<p>
Welcome to Team Fate!
</p>

<p>
We are always looking for active and friendly members
to join our community.
</p>

<h3>What We Offer</h3>

<ul>
<li>Active PokéMMO community</li>
<li>Shiny hunting events</li>
<li>Shiny Wars</li>
<li>Weekly community events</li>
<li>Team activities</li>
<li>Friendly and helpful members</li>
</ul>

<h3>Interested in Joining?</h3>

<p>
Join our Discord and get to know the team!
</p>
`;

function canManageSite(role?: string) {
  return MANAGER_ROLES.includes(
    role || ""
  );
}

function cleanUrl(url: string) {
  const value = url.trim();

  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:")
  ) {
    return value;
  }

  return `https://${value}`;
}

export default function AdminRecruitment() {
  const navigate = useNavigate();

  const editorRef =
    useRef<HTMLDivElement | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] =
    useState<ProfileData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [preview, setPreview] =
    useState(false);

  const [title, setTitle] =
    useState("Join Team Fate");

  const [content, setContent] =
    useState(DEFAULT_CONTENT);

  const [bannerUrl, setBannerUrl] =
    useState("");

  const [discordUrl, setDiscordUrl] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [statusType, setStatusType] =
    useState<
      "success" | "error" | ""
    >("");

  const [linkInput, setLinkInput] =
    useState("");

  const [showLinkInput, setShowLinkInput] =
    useState(false);

  /*
   * ============================================================
   * LOAD PROFILE
   * ============================================================
   */

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } =
      await supabase
        .from("profiles")
        .select(
          "id, username, nickname, avatar_url, role"
        )
        .eq("id", user.id)
        .single();

    if (error) {
      console.error(
        "Failed to load profile:",
        error
      );

      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(data);

    if (
      !canManageSite(data?.role)
    ) {
      setLoading(false);
      return;
    }

    await loadRecruitment();

    setLoading(false);
  }

  /*
   * ============================================================
   * LOAD RECRUITMENT
   * ============================================================
   */

  async function loadRecruitment() {
    const { data, error } =
      await supabase
        .from("recruitment_page")
        .select(
          `
          id,
          title,
          content,
          draft_content,
          banner_url,
          discord_url,
          updated_at,
          updated_by
          `
        )
        .eq("id", PAGE_ID)
        .single();

    if (error) {
      console.error(
        "Failed to load recruitment:",
        error
      );

      setStatus(
        "Unable to load the recruitment page."
      );

      setStatusType("error");

      return;
    }

    if (!data) {
      return;
    }

    const page =
      data as RecruitmentPage;

    setTitle(
      page.title ||
        "Join Team Fate"
    );

    /*
     * Admin gets the saved draft if one exists.
     * Otherwise load the published content.
     */

    setContent(
      page.draft_content ||
        page.content ||
        DEFAULT_CONTENT
    );

    setBannerUrl(
      page.banner_url ||
        ""
    );

    setDiscordUrl(
      page.discord_url ||
        ""
    );

    /*
     * Populate editor after React renders it.
     */

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML =
          page.draft_content ||
          page.content ||
          DEFAULT_CONTENT;
      }
    }, 0);
  }

  /*
   * ============================================================
   * EDITOR CONTENT
   * ============================================================
   */

  function syncEditor() {
    if (!editorRef.current) {
      return;
    }

    setContent(
      editorRef.current.innerHTML
    );
  }

  /*
   * ============================================================
   * FORMATTING
   * ============================================================
   */

  function format(
    command: string,
    value?: string
  ) {
    if (!editorRef.current) {
      return;
    }

    editorRef.current.focus();

    document.execCommand(
      command,
      false,
      value
    );

    syncEditor();
  }

  function bold() {
    format("bold");
  }

  function italic() {
    format("italic");
  }

  function underline() {
    format("underline");
  }

  function strike() {
    format("strikeThrough");
  }

  function heading() {
    format(
      "formatBlock",
      "h2"
    );
  }

  function subheading() {
    format(
      "formatBlock",
      "h3"
    );
  }

  function paragraph() {
    format(
      "formatBlock",
      "p"
    );
  }

  function center() {
    format(
      "justifyCenter"
    );
  }

  function left() {
    format(
      "justifyLeft"
    );
  }

  function right() {
    format(
      "justifyRight"
    );
  }

  function bulletList() {
    format(
      "insertUnorderedList"
    );
  }

  function numberedList() {
    format(
      "insertOrderedList"
    );
  }

  function clearFormat() {
    format(
      "removeFormat"
    );
  }

  /*
   * ============================================================
   * LINK
   * ============================================================
   */

  function openLinkBox() {
    setLinkInput("");
    setShowLinkInput(true);
  }

  function insertLink() {
    const url =
      cleanUrl(linkInput);

    if (!url) {
      return;
    }

    format(
      "createLink",
      url
    );

    setLinkInput("");
    setShowLinkInput(false);
  }

  /*
   * ============================================================
   * BANNER UPLOAD
   * ============================================================
   *
   * Uses the same "event-images" storage bucket pattern already
   * used elsewhere in the project.
   */

  function chooseBanner() {
    fileInputRef.current?.click();
  }

  async function handleBannerUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setStatus(
        "Please select an image file."
      );

      setStatusType("error");

      return;
    }

    setUploading(true);
    setStatus("");
    setStatusType("");

    try {
      const extension =
        file.name
          .split(".")
          .pop() ||
        "png";

      const fileName =
        `recruitment-${Date.now()}.${extension}`;

      const { error } =
        await supabase.storage
          .from("event-images")
          .upload(
            fileName,
            file,
            {
              cacheControl:
                "3600",
              upsert: true,
            }
          );

      if (error) {
        throw error;
      }

      const { data } =
        supabase.storage
          .from("event-images")
          .getPublicUrl(
            fileName
          );

      if (
        !data?.publicUrl
      ) {
        throw new Error(
          "Unable to create image URL."
        );
      }

      setBannerUrl(
        data.publicUrl
      );

      setStatus(
        "Banner uploaded. Publish the page to save it."
      );

      setStatusType(
        "success"
      );
    } catch (error: any) {
      console.error(
        "Banner upload error:",
        error
      );

      setStatus(
        error?.message ||
          "Banner upload failed."
      );

      setStatusType(
        "error"
      );
    }

    setUploading(false);

    /*
     * Allow selecting the same file again.
     */

    event.target.value = "";
  }

  /*
   * ============================================================
   * SAVE DRAFT
   * ============================================================
   */

  async function saveDraft() {
    if (
      !canManageSite(
        profile?.role
      )
    ) {
      return;
    }

    syncEditor();

    setSaving(true);
    setStatus("");
    setStatusType("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus(
        "You must be logged in."
      );

      setStatusType("error");
      setSaving(false);

      return;
    }

    const editorContent =
      editorRef.current
        ?.innerHTML ||
      content;

    const { error } =
      await supabase
        .from("recruitment_page")
        .update({
          title:
            title.trim() ||
            "Join Team Fate",

          draft_content:
            editorContent,

          banner_url:
            bannerUrl.trim() ||
            null,

          discord_url:
            discordUrl.trim() ||
            null,

          updated_at:
            new Date().toISOString(),

          updated_by:
            user.id,
        })
        .eq(
          "id",
          PAGE_ID
        );

    if (error) {
      console.error(
        "Save draft error:",
        error
      );

      setStatus(
        `Failed to save draft: ${error.message}`
      );

      setStatusType(
        "error"
      );

      setSaving(false);

      return;
    }

    setContent(
      editorContent
    );

    setStatus(
      "Draft saved successfully."
    );

    setStatusType(
      "success"
    );

    setSaving(false);
  }

  /*
   * ============================================================
   * PUBLISH
   * ============================================================
   */

  async function publish() {
    if (
      !canManageSite(
        profile?.role
      )
    ) {
      return;
    }

    syncEditor();

    setSaving(true);
    setStatus("");
    setStatusType("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus(
        "You must be logged in."
      );

      setStatusType("error");
      setSaving(false);

      return;
    }

    const editorContent =
      editorRef.current
        ?.innerHTML ||
      content;

    const finalTitle =
      title.trim() ||
      "Join Team Fate";

    const { error } =
      await supabase
        .from("recruitment_page")
        .update({
          title:
            finalTitle,

          content:
            editorContent,

          /*
           * Keep the draft synchronized
           * with the published version.
           */

          draft_content:
            editorContent,

          banner_url:
            bannerUrl.trim() ||
            null,

          discord_url:
            discordUrl.trim() ||
            null,

          updated_at:
            new Date().toISOString(),

          updated_by:
            user.id,
        })
        .eq(
          "id",
          PAGE_ID
        );

    if (error) {
      console.error(
        "Publish error:",
        error
      );

      setStatus(
        `Failed to publish: ${error.message}`
      );

      setStatusType(
        "error"
      );

      setSaving(false);

      return;
    }

    setContent(
      editorContent
    );

    setTitle(
      finalTitle
    );

    setStatus(
      "Recruitment page published successfully."
    );

    setStatusType(
      "success"
    );

    setSaving(false);

    /*
     * Reload the database version to ensure
     * everything displayed is current.
     */

    await loadRecruitment();
  }

  /*
   * ============================================================
   * PREVIEW
   * ============================================================
   */

  function togglePreview() {
    syncEditor();

    setPreview(
      !preview
    );
  }

  /*
   * ============================================================
   * NOT AUTHORIZED
   * ============================================================
   */

  if (
    !loading &&
    !canManageSite(
      profile?.role
    )
  ) {
    return (
      <div className="page">
        <div
          className="admin-card"
          style={{
            maxWidth:
              "700px",
            margin:
              "60px auto",
            padding:
              "40px",
            textAlign:
              "center",
          }}
        >
          <h1>
            Access Denied
          </h1>

          <p>
            You do not have permission
            to edit the Recruitment page.
          </p>

          <button
            className="submit-btn"
            onClick={() =>
              navigate(
                "/recruitment"
              )
            }
          >
            Back to Recruitment
          </button>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="page">
        <div
          className="admin-card"
          style={{
            padding:
              "40px",
            textAlign:
              "center",
          }}
        >
          Loading Recruitment Editor...
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div className="page">
      <div
        style={{
          maxWidth:
            "1100px",
          margin:
            "0 auto",
        }}
      >

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap:
              "20px",
            flexWrap:
              "wrap",
            marginBottom:
              "25px",
          }}
        >
          <div>
            <h1
              style={{
                margin:
                  0,
              }}
            >
              Recruitment Editor
            </h1>

            <p
              style={{
                margin:
                  "6px 0 0",
                opacity:
                  0.7,
              }}
            >
              Manage the public Team Fate
              recruitment page.
            </p>
          </div>

          <button
            className="submit-btn"
            onClick={() =>
              navigate(
                "/recruitment"
              )
            }
          >
            View Public Page
          </button>
        </div>

        {/* =====================================================
            STATUS
        ===================================================== */}

        {status && (
          <div
            style={{
              marginBottom:
                "20px",
              padding:
                "13px 16px",
              borderRadius:
                "8px",

              background:
                statusType ===
                "error"
                  ? "rgba(180,40,40,.18)"
                  : "rgba(40,160,90,.18)",

              border:
                statusType ===
                "error"
                  ? "1px solid rgba(255,80,80,.4)"
                  : "1px solid rgba(80,220,130,.4)",

              color:
                statusType ===
                "error"
                  ? "#ffb0b0"
                  : "#a8ffc2",
            }}
          >
            {status}
          </div>
        )}

        {/* =====================================================
            PREVIEW
        ===================================================== */}

        {preview ? (
          <div
            className="admin-card"
            style={{
              padding:
                "30px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap:
                  "15px",
                flexWrap:
                  "wrap",
                marginBottom:
                  "25px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin:
                      0,
                  }}
                >
                  Page Preview
                </h2>

                <p
                  style={{
                    margin:
                      "5px 0 0",
                    opacity:
                      0.6,
                  }}
                >
                  This is how the published
                  recruitment page will appear.
                </p>
              </div>

              <button
                className="submit-btn"
                onClick={
                  togglePreview
                }
              >
                Back to Editor
              </button>
            </div>

            {/* BANNER */}

            {bannerUrl && (
              <img
                src={bannerUrl}
                alt="Recruitment banner"
                style={{
                  width:
                    "100%",
                  maxHeight:
                    "450px",
                  objectFit:
                    "cover",
                  borderRadius:
                    "12px",
                  display:
                    "block",
                  marginBottom:
                    "30px",
                }}
              />
            )}

            {/* TITLE */}

            <h1>
              {title ||
                "Join Team Fate"}
            </h1>

            {/* CONTENT */}

            <div
              className="recruitment-content"
              dangerouslySetInnerHTML={{
                __html:
                  content ||
                  DEFAULT_CONTENT,
              }}
            />

            {/* DISCORD */}

            {discordUrl && (
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "center",
                  marginTop:
                    "35px",
                }}
              >
                <a
                  href={cleanUrl(
                    discordUrl
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="submit-btn"
                  style={{
                    textDecoration:
                      "none",
                  }}
                  onClick={(event) =>
                    event.preventDefault()
                  }
                >
                  💬 Join Team Fate Discord
                </a>
              </div>
            )}
          </div>
        ) : (
          /* ===================================================
             EDITOR
          =================================================== */

          <div
            className="admin-card"
            style={{
              padding:
                "30px",
            }}
          >

            {/* =================================================
                TITLE
            ================================================= */}

            <label
              style={{
                display:
                  "block",
                fontWeight:
                  700,
                marginBottom:
                  "8px",
              }}
            >
              Page Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              placeholder="Join Team Fate"
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                padding:
                  "12px 14px",
                borderRadius:
                  "8px",
                border:
                  "1px solid rgba(255,255,255,.15)",
                background:
                  "rgba(0,0,0,.2)",
                color:
                  "inherit",
                marginBottom:
                  "25px",
              }}
            />

            {/* =================================================
                BANNER
            ================================================= */}

            <label
              style={{
                display:
                  "block",
                fontWeight:
                  700,
                marginBottom:
                  "8px",
              }}
            >
              Banner Image
            </label>

            <div
              style={{
                display:
                  "flex",
                gap:
                  "10px",
                flexWrap:
                  "wrap",
                marginBottom:
                  "15px",
              }}
            >
              <input
                type="text"
                value={
                  bannerUrl
                }
                onChange={(event) =>
                  setBannerUrl(
                    event.target.value
                  )
                }
                placeholder="Paste banner image URL..."
                style={{
                  flex:
                    "1 1 400px",
                  padding:
                    "12px 14px",
                  borderRadius:
                    "8px",
                  border:
                    "1px solid rgba(255,255,255,.15)",
                  background:
                    "rgba(0,0,0,.2)",
                  color:
                    "inherit",
                }}
              />

              <button
                type="button"
                className="submit-btn"
                onClick={
                  chooseBanner
                }
                disabled={
                  uploading
                }
              >
                {uploading
                  ? "Uploading..."
                  : "Upload Banner"}
              </button>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/*"
                onChange={
                  handleBannerUpload
                }
                style={{
                  display:
                    "none",
                }}
              />
            </div>

            {bannerUrl && (
              <div
                style={{
                  marginBottom:
                    "25px",
                }}
              >
                <img
                  src={
                    bannerUrl
                  }
                  alt="Banner preview"
                  style={{
                    width:
                      "100%",
                    maxHeight:
                      "300px",
                    objectFit:
                      "cover",
                    borderRadius:
                      "10px",
                    display:
                      "block",
                  }}
                />

                <button
                  type="button"
                  className="delete-btn"
                  onClick={() =>
                    setBannerUrl(
                      ""
                    )
                  }
                  style={{
                    marginTop:
                      "10px",
                  }}
                >
                  Remove Banner
                </button>
              </div>
            )}

            {/* =================================================
                DISCORD
            ================================================= */}

            <label
              style={{
                display:
                  "block",
                fontWeight:
                  700,
                marginBottom:
                  "8px",
              }}
            >
              Discord Link
            </label>

            <input
              type="url"
              value={
                discordUrl
              }
              onChange={(event) =>
                setDiscordUrl(
                  event.target.value
                )
              }
              placeholder="https://discord.gg/..."
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                padding:
                  "12px 14px",
                borderRadius:
                  "8px",
                border:
                  "1px solid rgba(255,255,255,.15)",
                background:
                  "rgba(0,0,0,.2)",
                color:
                  "inherit",
                marginBottom:
                  "25px",
              }}
            />

            {/* =================================================
                CONTENT
            ================================================= */}

            <label
              style={{
                display:
                  "block",
                fontWeight:
                  700,
                marginBottom:
                  "8px",
              }}
            >
              Recruitment Content
            </label>

            {/* TOOLBAR */}

            <div
              style={{
                display:
                  "flex",
                gap:
                  "5px",
                flexWrap:
                  "wrap",
                padding:
                  "10px",
                border:
                  "1px solid rgba(255,255,255,.15)",
                borderBottom:
                  "none",
                borderRadius:
                  "8px 8px 0 0",
                background:
                  "rgba(0,0,0,.2)",
              }}
            >
              <ToolbarButton
                label="B"
                onClick={
                  bold
                }
              />

              <ToolbarButton
                label="I"
                onClick={
                  italic
                }
              />

              <ToolbarButton
                label="U"
                onClick={
                  underline
                }
              />

              <ToolbarButton
                label="S"
                onClick={
                  strike
                }
              />

              <ToolbarDivider />

              <ToolbarButton
                label="H2"
                onClick={
                  heading
                }
              />

              <ToolbarButton
                label="H3"
                onClick={
                  subheading
                }
              />

              <ToolbarButton
                label="P"
                onClick={
                  paragraph
                }
              />

              <ToolbarDivider />

              <ToolbarButton
                label="←"
                onClick={
                  left
                }
              />

              <ToolbarButton
                label="↔"
                onClick={
                  center
                }
              />

              <ToolbarButton
                label="→"
                onClick={
                  right
                }
              />

              <ToolbarDivider />

              <ToolbarButton
                label="• List"
                onClick={
                  bulletList
                }
              />

              <ToolbarButton
                label="1. List"
                onClick={
                  numberedList
                }
              />

              <ToolbarDivider />

              <ToolbarButton
                label="🔗 Link"
                onClick={
                  openLinkBox
                }
              />

              <ToolbarButton
                label="Clear"
                onClick={
                  clearFormat
                }
              />
            </div>

            {/* LINK BOX */}

            {showLinkInput && (
              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "8px",
                  flexWrap:
                    "wrap",
                  padding:
                    "10px",
                  background:
                    "rgba(0,0,0,.15)",
                  border:
                    "1px solid rgba(255,255,255,.1)",
                }}
              >
                <input
                  type="url"
                  value={
                    linkInput
                  }
                  onChange={(event) =>
                    setLinkInput(
                      event.target.value
                    )
                  }
                  placeholder="https://example.com"
                  style={{
                    flex:
                      "1 1 300px",
                    padding:
                      "10px",
                    borderRadius:
                      "6px",
                    border:
                      "1px solid rgba(255,255,255,.15)",
                    background:
                      "rgba(0,0,0,.2)",
                    color:
                      "inherit",
                  }}
                  autoFocus
                />

                <button
                  type="button"
                  className="submit-btn"
                  onClick={
                    insertLink
                  }
                >
                  Insert
                </button>

                <button
                  type="button"
                  className="delete-btn"
                  onClick={() =>
                    setShowLinkInput(
                      false
                    )
                  }
                >
                  Cancel
                </button>
              </div>
            )}

            {/* EDITOR */}

            <div
              ref={
                editorRef
              }
              contentEditable
              suppressContentEditableWarning
              onInput={
                syncEditor
              }
              onBlur={
                syncEditor
              }
              dangerouslySetInnerHTML={{
                __html:
                  content ||
                  DEFAULT_CONTENT,
              }}
              style={{
                minHeight:
                  "400px",
                padding:
                  "20px",
                border:
                  "1px solid rgba(255,255,255,.15)",
                borderRadius:
                  "0 0 8px 8px",
                background:
                  "rgba(0,0,0,.15)",
                color:
                  "inherit",
                lineHeight:
                  1.7,
                outline:
                  "none",
              }}
            />

            {/* =================================================
                DISCORD PREVIEW
            ================================================= */}

            {discordUrl && (
              <div
                style={{
                  marginTop:
                    "25px",
                }}
              >
                <label
                  style={{
                    display:
                      "block",
                    fontWeight:
                      700,
                    marginBottom:
                      "10px",
                  }}
                >
                  Discord Button Preview
                </label>

                <a
                  href={cleanUrl(
                    discordUrl
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="submit-btn"
                  style={{
                    display:
                      "inline-flex",
                    textDecoration:
                      "none",
                  }}
                  onClick={(event) =>
                    event.preventDefault()
                  }
                >
                  💬 Join Team Fate Discord
                </a>
              </div>
            )}

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap:
                  "10px",
                flexWrap:
                  "wrap",
                marginTop:
                  "30px",
              }}
            >
              <button
                type="button"
                className="submit-btn"
                onClick={
                  togglePreview
                }
              >
                👁 Preview
              </button>

              <button
                type="button"
                className="submit-btn"
                onClick={
                  saveDraft
                }
                disabled={
                  saving
                }
              >
                {saving
                  ? "Saving..."
                  : "Save Draft"}
              </button>

              <button
                type="button"
                className="submit-btn"
                onClick={
                  publish
                }
                disabled={
                  saving
                }
              >
                {saving
                  ? "Publishing..."
                  : "Publish"}
              </button>

              <button
                type="button"
                className="delete-btn"
                onClick={() =>
                  navigate(
                    "/recruitment"
                  )
                }
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * TOOLBAR COMPONENTS
 * ============================================================
 */

function ToolbarButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onClick}
      style={{
        minWidth:
          "38px",
        height:
          "34px",
        padding:
          "0 8px",
        borderRadius:
          "6px",
        border:
          "1px solid rgba(255,255,255,.15)",
        background:
          "rgba(255,255,255,.05)",
        color:
          "inherit",
        cursor:
          "pointer",
        fontWeight:
          label === "B" ||
          label === "I" ||
          label === "U" ||
          label === "S"
            ? 700
            : 500,
      }}
    >
      {label}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <div
      style={{
        width:
          "1px",
        height:
          "28px",
        margin:
          "3px 4px",
        background:
          "rgba(255,255,255,.15)",
      }}
    />
  );
}
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

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

/*
 * ============================================================
 * ADMIN CONFIGURATION
 * ============================================================
 *
 * You can put Discord IDs here if you want to hard-code admins.
 *
 * Example:
 * const ADMIN_DISCORD_IDS = [
 *   "123456789012345678",
 *   "987654321098765432",
 * ];
 *
 * You can also use:
 *
 * VITE_ADMIN_DISCORD_IDS=123456789012345678,987654321098765432
 *
 * in your .env file.
 */

const ADMIN_DISCORD_IDS =
  import.meta.env.VITE_ADMIN_DISCORD_IDS
    ? String(import.meta.env.VITE_ADMIN_DISCORD_IDS)
        .split(",")
        .map((id: string) => id.trim())
        .filter(Boolean)
    : [];

/* ============================================================
   DEFAULT CONTENT
   ============================================================ */

const DEFAULT_CONTENT = `
<h2>Join Team Fate</h2>
<p>
  Welcome to Team Fate!
</p>
<p>
  We are always looking for active and friendly members to join our community.
</p>
<p>
  If you're interested in joining, click the Discord button below to get in touch with us.
</p>
`;

/* ============================================================
   HELPERS
   ============================================================ */

function getDiscordId(user: any): string | null {
  if (!user) return null;

  return (
    user.user_metadata?.discord_id ||
    user.user_metadata?.provider_id ||
    user.user_metadata?.sub ||
    user.identities?.[0]?.identity_data?.provider_id ||
    null
  );
}

function isUserAdmin(user: any): boolean {
  if (!user) return false;

  const discordId = getDiscordId(user);

  if (!discordId) return false;

  return ADMIN_DISCORD_IDS.includes(String(discordId));
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();

  if (!trimmed) return "";

  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("mailto:")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

/* ============================================================
   TOOLBAR BUTTON
   ============================================================ */

type ToolbarButtonProps = {
  label: string;
  title: string;
  onClick: () => void;
};

function ToolbarButton({
  label,
  title,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      className="recruitment-toolbar-button"
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

export default function Recruitment() {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [page, setPage] =
    useState<RecruitmentPage | null>(null);

  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploadingBanner, setUploadingBanner] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  const [showPreview, setShowPreview] =
    useState(false);

  const [title, setTitle] =
    useState("Join Team Fate");

  const [discordUrl, setDiscordUrl] =
    useState("");

  const [bannerUrl, setBannerUrl] =
    useState("");

  const [draftContent, setDraftContent] =
    useState("");

  const [statusMessage, setStatusMessage] =
    useState("");

  const [linkUrl, setLinkUrl] =
    useState("");

  const [showLinkBox, setShowLinkBox] =
    useState(false);

  const admin = isUserAdmin(user);

  /* ==========================================================
     LOAD USER
     ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUser(user);
      }
    }

    loadUser();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  /* ==========================================================
     LOAD RECRUITMENT PAGE
     ========================================================== */

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setStatusMessage("");

    const { data, error } = await supabase
      .from("recruitment_page")
      .select(`
        id,
        title,
        content,
        draft_content,
        banner_url,
        discord_url,
        updated_at,
        updated_by
      `)
      .eq("id", PAGE_ID)
      .maybeSingle();

    if (error) {
      console.error(
        "Failed to load recruitment page:",
        error
      );

      setStatusMessage(
        "Unable to load the recruitment page."
      );

      setLoading(false);
      return;
    }

    if (!data) {
      setPage({
        id: PAGE_ID,
        title: "Join Team Fate",
        content: DEFAULT_CONTENT,
        draft_content: null,
        banner_url: null,
        discord_url: null,
        updated_at: null,
        updated_by: null,
      });

      setTitle("Join Team Fate");
      setDraftContent(DEFAULT_CONTENT);
      setBannerUrl("");
      setDiscordUrl("");

      setLoading(false);
      return;
    }

    const loadedPage =
      data as RecruitmentPage;

    setPage(loadedPage);

    setTitle(
      loadedPage.title || "Join Team Fate"
    );

    setDraftContent(
      loadedPage.draft_content ??
        loadedPage.content ??
        DEFAULT_CONTENT
    );

    setBannerUrl(
      loadedPage.banner_url ?? ""
    );

    setDiscordUrl(
      loadedPage.discord_url ?? ""
    );

    setLoading(false);
  }

  /* ==========================================================
     START EDITING
     ========================================================== */

  function startEditing() {
    if (!admin) return;

    setStatusMessage("");
    setShowPreview(false);
    setIsEditing(true);

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML =
          draftContent || DEFAULT_CONTENT;
      }
    }, 0);
  }

  /* ==========================================================
     CANCEL EDITING
     ========================================================== */

  function cancelEditing() {
    setIsEditing(false);
    setShowPreview(false);
    setStatusMessage("");

    if (page) {
      setTitle(page.title);
      setDiscordUrl(page.discord_url ?? "");
      setBannerUrl(page.banner_url ?? "");

      setDraftContent(
        page.draft_content ??
          page.content ??
          DEFAULT_CONTENT
      );
    }
  }

  /* ==========================================================
     EDITOR CONTENT
     ========================================================== */

  function syncEditor() {
    if (!editorRef.current) return;

    setDraftContent(
      editorRef.current.innerHTML
    );
  }

  /* ==========================================================
     RICH TEXT COMMAND
     ========================================================== */

  function execCommand(
    command: string,
    value?: string
  ) {
    if (!editorRef.current) return;

    editorRef.current.focus();

    document.execCommand(
      command,
      false,
      value
    );

    syncEditor();
  }

  /* ==========================================================
     FORMATTERS
     ========================================================== */

  function makeBold() {
    execCommand("bold");
  }

  function makeItalic() {
    execCommand("italic");
  }

  function makeUnderline() {
    execCommand("underline");
  }

  function alignLeft() {
    execCommand("justifyLeft");
  }

  function alignCenter() {
    execCommand("justifyCenter");
  }

  function alignRight() {
    execCommand("justifyRight");
  }

  function makeBulletList() {
    execCommand("insertUnorderedList");
  }

  function makeNumberList() {
    execCommand("insertOrderedList");
  }

  function createHeading() {
    execCommand(
      "formatBlock",
      "h2"
    );
  }

  function createParagraph() {
    execCommand(
      "formatBlock",
      "p"
    );
  }

  /* ==========================================================
     LINK
     ========================================================== */

  function openLinkBox() {
    setLinkUrl("");
    setShowLinkBox(true);
  }

  function insertLink() {
    const url = sanitizeUrl(linkUrl);

    if (!url) {
      setShowLinkBox(false);
      return;
    }

    execCommand(
      "createLink",
      url
    );

    setLinkUrl("");
    setShowLinkBox(false);
  }

  /* ==========================================================
     REMOVE FORMAT
     ========================================================== */

  function clearFormatting() {
    execCommand(
      "removeFormat"
    );
  }

  /* ==========================================================
     BANNER UPLOAD
     ========================================================== */

  function selectBanner() {
    fileInputRef.current?.click();
  }

  async function handleBannerUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage(
        "Please select an image file."
      );
      return;
    }

    setUploadingBanner(true);
    setStatusMessage("");

    try {
      const extension =
        file.name.split(".").pop() ||
        "png";

      const fileName =
        `recruitment-${Date.now()}.${extension}`;

      const filePath =
        `recruitment/${fileName}`;

      /*
       * This expects a Supabase Storage bucket
       * named "site-images".
       *
       * If your bucket has a different name,
       * change it here.
       */

      const {
        error: uploadError,
      } = await supabase.storage
        .from("site-images")
        .upload(
          filePath,
          file,
          {
            cacheControl: "3600",
            upsert: true,
          }
        );

      if (uploadError) {
        console.error(
          uploadError
        );

        setStatusMessage(
          `Banner upload failed: ${uploadError.message}`
        );

        setUploadingBanner(false);
        return;
      }

      const {
        data: publicData,
      } = supabase.storage
        .from("site-images")
        .getPublicUrl(filePath);

      setBannerUrl(
        publicData.publicUrl
      );

      setStatusMessage(
        "Banner uploaded. Publish the page to save it."
      );
    } catch (error) {
      console.error(error);

      setStatusMessage(
        "Unable to upload banner."
      );
    }

    setUploadingBanner(false);
  }

  /* ==========================================================
     SAVE DRAFT
     ========================================================== */

  async function saveDraft() {
    if (!admin) return;

    syncEditor();

    setSaving(true);
    setStatusMessage("");

    const {
      data: {
        user: currentUser,
      },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setStatusMessage(
        "You must be logged in."
      );

      setSaving(false);
      return;
    }

    const content =
      editorRef.current?.innerHTML ??
      draftContent;

    const { error } = await supabase
      .from("recruitment_page")
      .update({
        title:
          title.trim() ||
          "Join Team Fate",

        draft_content: content,

        banner_url:
          bannerUrl.trim() || null,

        discord_url:
          discordUrl.trim() || null,

        updated_at:
          new Date().toISOString(),

        updated_by:
          currentUser.id,
      })
      .eq("id", PAGE_ID);

    if (error) {
      console.error(error);

      setStatusMessage(
        `Unable to save draft: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setDraftContent(content);

    setStatusMessage(
      "Draft saved successfully."
    );

    setSaving(false);
  }

  /* ==========================================================
     PUBLISH
     ========================================================== */

  async function publishPage() {
    if (!admin) return;

    syncEditor();

    setSaving(true);
    setStatusMessage("");

    const {
      data: {
        user: currentUser,
      },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setStatusMessage(
        "You must be logged in."
      );

      setSaving(false);
      return;
    }

    const content =
      editorRef.current?.innerHTML ??
      draftContent;

    const cleanTitle =
      title.trim() ||
      "Join Team Fate";

    const { error } = await supabase
      .from("recruitment_page")
      .update({
        title: cleanTitle,

        content,

        draft_content: content,

        banner_url:
          bannerUrl.trim() || null,

        discord_url:
          discordUrl.trim() || null,

        updated_at:
          new Date().toISOString(),

        updated_by:
          currentUser.id,
      })
      .eq("id", PAGE_ID);

    if (error) {
      console.error(error);

      setStatusMessage(
        `Unable to publish: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setPage((previous) => ({
      ...(previous ?? {
        id: PAGE_ID,
        title: cleanTitle,
        content,
        draft_content: content,
        banner_url: null,
        discord_url: null,
        updated_at: null,
        updated_by: null,
      }),

      title: cleanTitle,
      content,
      draft_content: content,
      banner_url:
        bannerUrl.trim() || null,
      discord_url:
        discordUrl.trim() || null,
      updated_at:
        new Date().toISOString(),
      updated_by:
        currentUser.id,
    }));

    setTitle(cleanTitle);
    setDraftContent(content);

    setStatusMessage(
      "Recruitment page published successfully."
    );

    setIsEditing(false);
    setShowPreview(false);

    setSaving(false);
  }

  /* ==========================================================
     PREVIEW
     ========================================================== */

  function togglePreview() {
    syncEditor();

    setShowPreview(
      (previous) => !previous
    );
  }

  /* ==========================================================
     LOADING
     ========================================================== */

  if (loading) {
    return (
      <div className="recruitment-page">
        <div className="recruitment-container">
          <h1 className="page-title">
            Recruitment
          </h1>

          <div className="recruitment-card">
            Loading recruitment information...
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
     PUBLIC CONTENT
     ========================================================== */

  const publicTitle =
    page?.title ||
    "Join Team Fate";

  const publicContent =
    page?.content ||
    DEFAULT_CONTENT;

  return (
    <div className="recruitment-page">
      <div className="recruitment-container">

        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <div className="recruitment-header">
          <h1 className="page-title">
            Recruitment
          </h1>

          {admin && !isEditing && (
            <button
              type="button"
              className="recruitment-admin-button"
              onClick={startEditing}
            >
              ✎ Edit Recruitment
            </button>
          )}
        </div>

        {/* ==================================================
            EDITOR
        ================================================== */}

        {isEditing ? (
          <div className="recruitment-editor-card">

            <div className="recruitment-admin-header">
              <h2>
                Edit Recruitment Page
              </h2>

              <span className="admin-badge">
                ADMIN
              </span>
            </div>

            {/* TITLE */}

            <label className="recruitment-label">
              Page Title
            </label>

            <input
              type="text"
              className="recruitment-input"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              placeholder="Join Team Fate"
            />

            {/* BANNER */}

            <label className="recruitment-label">
              Banner Image
            </label>

            <div className="banner-controls">

              <input
                type="text"
                className="recruitment-input"
                value={bannerUrl}
                onChange={(event) =>
                  setBannerUrl(
                    event.target.value
                  )
                }
                placeholder="Banner image URL..."
              />

              <button
                type="button"
                className="recruitment-secondary-button"
                onClick={selectBanner}
                disabled={
                  uploadingBanner
                }
              >
                {uploadingBanner
                  ? "Uploading..."
                  : "Upload Banner"}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={
                  handleBannerUpload
                }
                style={{
                  display: "none",
                }}
              />

            </div>

            {bannerUrl && (
              <div className="banner-preview">
                <img
                  src={bannerUrl}
                  alt="Recruitment banner preview"
                  onError={(event) => {
                    event.currentTarget.style.display =
                      "none";
                  }}
                />
              </div>
            )}

            {/* DISCORD */}

            <label className="recruitment-label">
              Discord Invite URL
            </label>

            <input
              type="url"
              className="recruitment-input"
              value={discordUrl}
              onChange={(event) =>
                setDiscordUrl(
                  event.target.value
                )
              }
              placeholder="https://discord.gg/..."
            />

            {/* TOOLBAR */}

            <label className="recruitment-label">
              Page Content
            </label>

            <div className="recruitment-toolbar">

              <ToolbarButton
                label="B"
                title="Bold"
                onClick={
                  makeBold
                }
              />

              <ToolbarButton
                label="I"
                title="Italic"
                onClick={
                  makeItalic
                }
              />

              <ToolbarButton
                label="U"
                title="Underline"
                onClick={
                  makeUnderline
                }
              />

              <div className="toolbar-divider" />

              <ToolbarButton
                label="H2"
                title="Heading"
                onClick={
                  createHeading
                }
              />

              <ToolbarButton
                label="P"
                title="Paragraph"
                onClick={
                  createParagraph
                }
              />

              <div className="toolbar-divider" />

              <ToolbarButton
                label="≡"
                title="Align Left"
                onClick={
                  alignLeft
                }
              />

              <ToolbarButton
                label="≡"
                title="Center"
                onClick={
                  alignCenter
                }
              />

              <ToolbarButton
                label="≡"
                title="Align Right"
                onClick={
                  alignRight
                }
              />

              <div className="toolbar-divider" />

              <ToolbarButton
                label="• List"
                title="Bullet List"
                onClick={
                  makeBulletList
                }
              />

              <ToolbarButton
                label="1. List"
                title="Numbered List"
                onClick={
                  makeNumberList
                }
              />

              <div className="toolbar-divider" />

              <ToolbarButton
                label="🔗"
                title="Insert Link"
                onClick={
                  openLinkBox
                }
              />

              <ToolbarButton
                label="Clear"
                title="Remove Formatting"
                onClick={
                  clearFormatting
                }
              />

            </div>

            {/* LINK POPUP */}

            {showLinkBox && (
              <div className="recruitment-link-box">

                <input
                  type="url"
                  className="recruitment-input"
                  value={linkUrl}
                  onChange={(event) =>
                    setLinkUrl(
                      event.target.value
                    )
                  }
                  placeholder="https://example.com"
                  autoFocus
                />

                <button
                  type="button"
                  className="recruitment-primary-button"
                  onClick={
                    insertLink
                  }
                >
                  Insert Link
                </button>

                <button
                  type="button"
                  className="recruitment-secondary-button"
                  onClick={() =>
                    setShowLinkBox(
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
              ref={editorRef}
              className="recruitment-rich-editor"
              contentEditable
              suppressContentEditableWarning
              onInput={
                syncEditor
              }
              onBlur={
                syncEditor
              }
            />

            {/* DISCORD BUTTON PREVIEW */}

            {discordUrl && (
              <div className="discord-preview-section">

                <div className="recruitment-label">
                  Discord Button Preview
                </div>

                <a
                  href={sanitizeUrl(
                    discordUrl
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="discord-button"
                  onClick={(event) =>
                    event.preventDefault()
                  }
                >
                  💬 Join Team Fate Discord
                </a>

              </div>
            )}

            {/* PREVIEW */}

            {showPreview && (
              <div className="recruitment-preview">

                <div className="recruitment-preview-label">
                  ADMIN PREVIEW
                </div>

                {bannerUrl && (
                  <img
                    src={bannerUrl}
                    alt=""
                    className="recruitment-banner"
                  />
                )}

                <h2>
                  {title ||
                    "Join Team Fate"}
                </h2>

                <div
                  className="recruitment-content"
                  dangerouslySetInnerHTML={{
                    __html:
                      draftContent ||
                      DEFAULT_CONTENT,
                  }}
                />

                {discordUrl && (
                  <a
                    href={sanitizeUrl(
                      discordUrl
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="discord-button"
                  >
                    💬 Join Team Fate Discord
                  </a>
                )}

              </div>
            )}

            {/* STATUS */}

            {statusMessage && (
              <div className="recruitment-status">
                {statusMessage}
              </div>
            )}

            {/* ACTIONS */}

            <div className="recruitment-editor-actions">

              <button
                type="button"
                className="recruitment-secondary-button"
                onClick={
                  togglePreview
                }
              >
                {showPreview
                  ? "Hide Preview"
                  : "Preview"}
              </button>

              <button
                type="button"
                className="recruitment-secondary-button"
                onClick={
                  saveDraft
                }
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Draft"}
              </button>

              <button
                type="button"
                className="recruitment-primary-button"
                onClick={
                  publishPage
                }
                disabled={saving}
              >
                {saving
                  ? "Publishing..."
                  : "Publish"}
              </button>

              <button
                type="button"
                className="recruitment-danger-button"
                onClick={
                  cancelEditing
                }
                disabled={saving}
              >
                Cancel
              </button>

            </div>

          </div>
        ) : (
          /* ==================================================
             PUBLIC PAGE
             ================================================== */

          <div className="recruitment-card">

            {page?.banner_url && (
              <img
                src={page.banner_url}
                alt=""
                className="recruitment-banner"
              />
            )}

            <h2 className="recruitment-title">
              {publicTitle}
            </h2>

            <div
              className="recruitment-content"
              dangerouslySetInnerHTML={{
                __html:
                  publicContent,
              }}
            />

{page?.discord_url && (
  <div className="recruitment-discord">
    <img
      src="/jirachi-pokemon.gif"
      alt="Dancing Jirachi"
      className="jirachi-dance"
    />

    <a
      href={sanitizeUrl(page.discord_url)}
      target="_blank"
      rel="noreferrer"
      className="discord-button"
    >
      💬 Join Team Fate Discord
    </a>

    <img
      src="/jirachi-pokemon.gif"
      alt="Dancing Jirachi"
      className="jirachi-dance"
    />
  </div>
)}

            {page?.updated_at && (
              <div className="recruitment-last-updated">
                Last updated:{" "}
                {new Date(
                  page.updated_at
                ).toLocaleDateString()}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
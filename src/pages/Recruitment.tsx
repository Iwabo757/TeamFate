import { useEffect, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { supabase } from "../lib/supabase";

type RecruitmentPageData = {
  id: number;
  content: string | null;
  draft_content: string | null;
  banner_url: string | null;
  discord_url: string | null;
  updated_at: string | null;
};

export default function Recruitment() {
  const [pageData, setPageData] =
    useState<RecruitmentPageData | null>(null);

  const [content, setContent] =
    useState("");

  const [draftContent, setDraftContent] =
    useState("");

  const [bannerUrl, setBannerUrl] =
    useState("");

  const [discordUrl, setDiscordUrl] =
    useState("");

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [previewMode, setPreviewMode] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadPage();
    checkAdmin();
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD PAGE
   * ---------------------------------------------------------
   */

  async function loadPage() {
    setLoading(true);

    const { data, error } =
      await supabase
        .from("recruitment_page")
        .select("*")
        .eq("id", 1)
        .single();

    if (error) {
      console.error(
        "Failed to load recruitment page:",
        error
      );

      setLoading(false);
      return;
    }

    if (data) {
      setPageData(data);

      setContent(
        data.content || ""
      );

      setDraftContent(
        data.draft_content ||
          data.content ||
          ""
      );

      setBannerUrl(
        data.banner_url || ""
      );

      setDiscordUrl(
        data.discord_url || ""
      );
    }

    setLoading(false);
  }

  /*
   * ---------------------------------------------------------
   * CHECK ADMIN
   * ---------------------------------------------------------
   */

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsAdmin(false);
      return;
    }

    /*
     * Change this query if your project
     * stores admin information differently.
     */

    const { data, error } =
      await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (error) {
      console.error(
        "Admin check failed:",
        error
      );

      setIsAdmin(false);
      return;
    }

    setIsAdmin(
      data?.is_admin === true
    );
  }

  /*
   * ---------------------------------------------------------
   * START EDITING
   * ---------------------------------------------------------
   */

  function startEditing() {
    setDraftContent(
      content
    );

    setPreviewMode(false);

    setMessage("");

    setEditing(true);
  }

  /*
   * ---------------------------------------------------------
   * CANCEL EDITING
   * ---------------------------------------------------------
   */

  function cancelEditing() {
    setDraftContent(
      content
    );

    setBannerUrl(
      pageData?.banner_url || ""
    );

    setDiscordUrl(
      pageData?.discord_url || ""
    );

    setPreviewMode(false);

    setMessage("");

    setEditing(false);
  }

  /*
   * ---------------------------------------------------------
   * UPLOAD BANNER
   * ---------------------------------------------------------
   */

  async function uploadBanner(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setMessage("");

    try {
      const fileExtension =
        file.name
          .split(".")
          .pop();

      const fileName =
        `banner-${Date.now()}.${fileExtension}`;

      const filePath =
        `recruitment/${fileName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from(
          "recruitment-banners"
        )
        .upload(
          filePath,
          file,
          {
            cacheControl:
              "3600",
            upsert: false,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicData,
      } =
        supabase.storage
          .from(
            "recruitment-banners"
          )
          .getPublicUrl(
            filePath
          );

      if (!publicData?.publicUrl) {
        throw new Error(
          "Could not get banner URL."
        );
      }

      setBannerUrl(
        publicData.publicUrl
      );

      setMessage(
        "Banner uploaded."
      );
    } catch (error) {
      console.error(
        "Banner upload failed:",
        error
      );

      setMessage(
        "Failed to upload banner."
      );
    } finally {
      setUploading(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * SAVE DRAFT
   * ---------------------------------------------------------
   */

  async function saveDraft() {
    setSaving(true);
    setMessage("");

    const { error } =
      await supabase
        .from("recruitment_page")
        .update({
          draft_content:
            draftContent,
          banner_url:
            bannerUrl || null,
          discord_url:
            discordUrl || null,
        })
        .eq("id", 1);

    if (error) {
      console.error(
        "Draft save failed:",
        error
      );

      setMessage(
        "Failed to save draft."
      );

      setSaving(false);
      return;
    }

    setMessage(
      "Draft saved."
    );

    setSaving(false);
  }

  /*
   * ---------------------------------------------------------
   * PUBLISH
   * ---------------------------------------------------------
   */

  async function publishPage() {
    setSaving(true);
    setMessage("");

    const { error } =
      await supabase
        .from("recruitment_page")
        .update({
          content:
            draftContent,
          draft_content:
            draftContent,
          banner_url:
            bannerUrl || null,
          discord_url:
            discordUrl || null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", 1);

    if (error) {
      console.error(
        "Publish failed:",
        error
      );

      setMessage(
        "Failed to publish page."
      );

      setSaving(false);
      return;
    }

    setContent(
      draftContent
    );

    setPageData(
      (previous) =>
        previous
          ? {
              ...previous,
              content:
                draftContent,
              draft_content:
                draftContent,
              banner_url:
                bannerUrl ||
                null,
              discord_url:
                discordUrl ||
                null,
              updated_at:
                new Date().toISOString(),
            }
          : previous
    );

    setMessage(
      "Recruitment page published successfully."
    );

    setPreviewMode(false);
    setEditing(false);

    setSaving(false);
  }

  /*
   * ---------------------------------------------------------
   * QUILL TOOLBAR
   * ---------------------------------------------------------
   */

  const modules = {
    toolbar: [
      [
        {
          header: [
            1,
            2,
            3,
            false,
          ],
        },
      ],

      [
        "bold",
        "italic",
        "underline",
        "strike",
      ],

      [
        {
          align: [],
        },
      ],

      [
        {
          list: "ordered",
        },
        {
          list: "bullet",
        },
      ],

      [
        {
          indent: "-1",
        },
        {
          indent: "+1",
        },
      ],

      [
        "link",
      ],

      [
        "clean",
      ],
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "align",
    "list",
    "indent",
    "link",
  ];

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          Loading recruitment...
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * EDITOR / ADMIN VIEW
   * ---------------------------------------------------------
   */

  if (
    editing &&
    isAdmin
  ) {
    return (
      <div className="page recruitment-page">

        <div className="recruitment-header">
          <div>
            <h1>
              Recruitment
            </h1>

            <p>
              Edit the Team Fate
              recruitment page.
            </p>
          </div>

          <div className="recruitment-actions">

            <button
              className="leader-filter"
              onClick={() =>
                setPreviewMode(
                  !previewMode
                )
              }
            >
              {previewMode
                ? "Back to Edit"
                : "Preview"}
            </button>

            <button
              className="leader-filter"
              onClick={
                cancelEditing
              }
            >
              Cancel
            </button>

          </div>
        </div>

        {previewMode ? (
          <div className="recruitment-preview">

            <div className="preview-label">
              PREVIEW
            </div>

            {bannerUrl && (
              <img
                src={bannerUrl}
                alt="Recruitment banner"
                className="recruitment-banner"
              />
            )}

            <div
              className="recruitment-content"
              dangerouslySetInnerHTML={{
                __html:
                  draftContent,
              }}
            />

            {discordUrl && (
              <div className="discord-button-container">
                <a
                  href={
                    discordUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="discord-button"
                >
                  Join Team Fate Discord
                </a>
              </div>
            )}

          </div>
        ) : (
          <div className="recruitment-editor">

            <div className="editor-section">

              <label>
                Banner Image
              </label>

              {bannerUrl && (
                <div className="banner-preview">

                  <img
                    src={bannerUrl}
                    alt="Current recruitment banner"
                  />

                  <button
                    type="button"
                    className="remove-banner"
                    onClick={() =>
                      setBannerUrl("")
                    }
                  >
                    Remove Banner
                  </button>

                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={
                  uploadBanner
                }
                disabled={
                  uploading
                }
              />

              {uploading && (
                <p>
                  Uploading banner...
                </p>
              )}

            </div>

            <div className="editor-section">

              <label>
                Discord Invite
              </label>

              <input
                type="url"
                value={
                  discordUrl
                }
                onChange={(e) =>
                  setDiscordUrl(
                    e.target.value
                  )
                }
                placeholder="https://discord.gg/..."
                className="recruitment-input"
              />

              <small>
                This creates the
                "Join Team Fate
                Discord" button.
              </small>

            </div>

            <div className="editor-section">

              <label>
                Recruitment Information
              </label>

              <ReactQuill
                theme="snow"
                value={
                  draftContent
                }
                onChange={
                  setDraftContent
                }
                modules={
                  modules
                }
                formats={
                  formats
                }
              />

            </div>

            <div className="editor-bottom-actions">

              <button
                className="leader-filter"
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
                className="leader-filter active"
                onClick={
                  publishPage
                }
                disabled={
                  saving
                }
              >
                {saving
                  ? "Publishing..."
                  : "Publish"}
              </button>

            </div>

            {message && (
              <div className="recruitment-message">
                {message}
              </div>
            )}

          </div>
        )}

      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * PUBLIC VIEW
   * ---------------------------------------------------------
   */

  return (
    <div className="page recruitment-page">

      {isAdmin && (
        <div className="recruitment-admin-bar">

          <button
            className="leader-filter"
            onClick={
              startEditing
            }
          >
            Edit Recruitment
          </button>

        </div>
      )}

      {bannerUrl && (
        <img
          src={bannerUrl}
          alt="Team Fate Recruitment"
          className="recruitment-banner"
        />
      )}

      <div
        className="recruitment-content"
        dangerouslySetInnerHTML={{
          __html:
            content,
        }}
      />

      {discordUrl && (
        <div className="discord-button-container">

          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="discord-button"
          >
            Join Team Fate Discord
          </a>

        </div>
      )}

      {pageData?.updated_at && (
        <div className="recruitment-updated">
          Last updated{" "}
          {new Date(
            pageData.updated_at
          ).toLocaleDateString()}
        </div>
      )}

    </div>
  );
}
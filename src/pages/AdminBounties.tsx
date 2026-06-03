import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ContentBlock = {
  type: "text" | "image";
  content: string;
  file?: File;
};

export default function AdminBountys() {
  const [bounties, setBountys] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [prize, setPrize] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [bannerFile, setBannerFile] =
    useState<File | null>(null);

  const [blocks, setBlocks] =
    useState<ContentBlock[]>([
      {
        type: "text",
        content: "",
      },
    ]);

  useEffect(() => {
    loadBountys();
  }, []);

  async function loadBountys() {
    const { data } = await supabase
      .from("bounties")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setBountys(data || []);
  }

  async function uploadImage(
    file: File
  ) {
    const fileName =
      `${Date.now()}-${file.name}`;

    const { error } =
      await supabase.storage
        .from("event-images")
        .upload(
          fileName,
          file
        );

    if (error)
      throw error;

    const { data } =
      supabase.storage
        .from("event-images")
        .getPublicUrl(
          fileName
        );

    return data.publicUrl;
  }

  function addTextBlock() {
    setBlocks([
      ...blocks,
      {
        type: "text",
        content: "",
      },
    ]);
  }

  function addImageBlock() {
    setBlocks([
      ...blocks,
      {
        type: "image",
        content: "",
      },
    ]);
  }

  function updateBlock(
    index: number,
    value: string
  ) {
    const copy = [
      ...blocks,
    ];

    copy[index].content =
      value;

    setBlocks(copy);
  }

  async function createBounty() {
    try {
      let bannerUrl = null;

      if (bannerFile) {
        bannerUrl =
          await uploadImage(
            bannerFile
          );
      }

      const firstText =
        blocks.find(
          (b) =>
            b.type ===
            "text"
        )?.content || "";

      const {
        data: bounty,
        error,
      } = await supabase
        .from("bounties")
        .insert({
          title,
          description:
            firstText,
          prize,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          banner_url: bannerUrl,
        })
        .select()
        .single();

      if (error)
        throw error;

      for (
        let i = 0;
        i <
        blocks.length;
        i++
      ) {
        const block =
          blocks[i];

        let content =
          block.content;

        if (
          block.type ===
            "image" &&
          block.file
        ) {
          content =
            await uploadImage(
              block.file
            );
        }

        await supabase
          .from(
            "bounty_content_blocks"
          )
          .insert({
            bounty_id:
              bounty.id,
            block_type:
              block.type,
            content,
            display_order:
              i,
          });
      }

      alert(
        "Bounty Created"
      );

      setTitle("");
      setPrize("");
      setStartTime("");
      setEndTime("");
      setBannerFile(
        null
      );

      setBlocks([
        {
          type: "text",
          content: "",
        },
      ]);

      loadBountys();

    } catch (err: any) {
      alert(
        err.message
      );
    }
  }

  async function deleteBounty(
    id: string
  ) {
    if (
      !window.confirm(
        "Delete Bounty?"
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("bounties")
        .delete()
        .eq("id", id);

    if (error) {
      alert(
        error.message
      );
      return;
    }

    loadBountys();
  }

  return (
    <div className="page">

      <h1>
        Create Bounty
      </h1>

      <div className="card">

        <div className="admin-form">

          <input
            className="dex-search"
            placeholder="Title"
            value={title}
            onChange={(
              e
            ) =>
              setTitle(
                e.target
                  .value
              )
            }
          />

          <input
            type="file"
            accept="image/*"
            onChange={(
              e
            ) =>
              setBannerFile(
                e.target
                  .files?.[0] ||
                  null
              )
            }
          />

          <input
            type="datetime-local"
            value={
              startTime
            }
            onChange={(
              e
            ) =>
              setStartTime(
                e.target
                  .value
              )
            }
          />

          <input
            type="datetime-local"
            value={
              endTime
            }
            onChange={(
              e
            ) =>
              setEndTime(
                e.target
                  .value
              )
            }
          />

          <input
            placeholder="Prize"
            value={prize}
            onChange={(
              e
            ) =>
              setPrize(
                e.target
                  .value
              )
            }
          />

          <div
            style={{
              display:
                "flex",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={
                addTextBlock
              }
            >
              Add Text
            </button>

            <button
              type="button"
              onClick={
                addImageBlock
              }
            >
              Add Image
            </button>
          </div>

          {blocks.map(
            (
              block,
              index
            ) => (
              <div
                key={
                  index
                }
              >
                {block.type ===
                "text" ? (
                  <textarea
                    placeholder="Text Block"
                    value={
                      block.content
                    }
                    onChange={(
                      e
                    ) =>
                      updateBlock(
                        index,
                        e
                          .target
                          .value
                      )
                    }
                  />
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(
                      e
                    ) => {
                      const
                        copy =
                          [
                            ...blocks,
                          ];

                      copy[
                        index
                      ].file =
                        e
                          .target
                          .files?.[0];

                      setBlocks(
                        copy
                      );
                    }}
                  />
                )}
              </div>
            )
          )}

          <button
            className="submit-btn"
            onClick={
              createBounty
            }
          >
            Create Bounty
          </button>

        </div>

      </div>

      <h2>
        Existing Bountys
      </h2>

      {bounties.map(
        (event) => (
          <div
            key={
              event.id
            }
            className="card"
          >
            {event.banner_url && (
              <img
                src={
                  event.banner_url
                }
                alt=""
                style={{
                  width:
                    "100%",
                  borderRadius:
                    "12px",
                  marginBottom:
                    "15px",
                }}
              />
            )}

            <h3>
              {
                event.title
              }
            </h3>

<p>
  Starts:{" "}
  {new Date(event.start_time).toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  )}
</p>

<p>
  Ends:{" "}
  {new Date(event.end_time).toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  )}
</p>

            <p>
              Prize:{" "}
              {
                event.prize
              }
            </p>

            <button
              className="delete-btn"
              onClick={() =>
                deleteBounty(
                  event.id
                )
              }
            >
              Delete
            </button>
          </div>
        )
      )}

    </div>
  );
}
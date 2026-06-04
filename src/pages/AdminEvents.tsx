import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useParams } from "react-router-dom";



type ContentBlock = {
  type: "text" | "image";
  content: string;
  file?: File;
};

export default function AdminEvents() {
  const [events, setEvents] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [prize, setPrize] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
const { id } = useParams();
const editing = !!id;
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
  loadEvents();

  if (id) {
    loadEvent(id);
  }
}, [id]);

async function loadEvents() {
  const { data } =
    await supabase
      .from("events")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

  setEvents(data || []);
}


async function loadEvent(
  eventId: string
) {
  const { data } =
    await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

  if (!data) return;

  setTitle(data.title || "");
  setPrize(data.prize || "");
  setStartTime(
    data.start_time
      ? data.start_time.slice(0, 16)
      : ""
  );

  setEndTime(
    data.end_time
      ? data.end_time.slice(0, 16)
      : ""
  );

  const { data: blockData } =
    await supabase
      .from("event_content_blocks")
      .select("*")
      .eq("event_id", eventId)
      .order("display_order");

  if (blockData?.length) {
    setBlocks(
      blockData.map((b) => ({
        type:
          b.block_type,
        content:
          b.content,
      }))
    );
  }
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

  async function createEvent() {
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
        data: event,
        error,
      } = await supabase
        .from("events")
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
            "event_content_blocks"
          )
          .insert({
            event_id:
              event.id,
            block_type:
              block.type,
            content,
            display_order:
              i,
          });
      }

      alert(
        "Event Created"
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

      loadEvents();

    } catch (err: any) {
      alert(
        err.message
      );
    }
  }


async function saveEvent() {
  if (!editing) {
    return createEvent();
  }

  let bannerUrl;

  if (bannerFile) {
    bannerUrl =
      await uploadImage(
        bannerFile
      );
  }

  const { error } =
    await supabase
      .from("events")
      .update({
        title,
        prize,
        banner_url:
          bannerUrl,
        start_time:
          new Date(
            startTime
          ).toISOString(),
        end_time:
          new Date(
            endTime
          ).toISOString(),
      })
      .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await supabase
    .from(
      "event_content_blocks"
    )
    .delete()
    .eq("event_id", id);

  for (
    let i = 0;
    i < blocks.length;
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
        "event_content_blocks"
      )
      .insert({
        event_id: id,
        block_type:
          block.type,
        content,
        display_order:
          i,
      });
  }

  alert(
    "Event Updated"
  );
}


  async function deleteEvent(
    id: string
  ) {
    if (
      !window.confirm(
        "Delete Event?"
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("events")
        .delete()
        .eq("id", id);

    if (error) {
      alert(
        error.message
      );
      return;
    }

    loadEvents();
  }

  return (
    <div className="page">



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
  onClick={saveEvent}
>
  {editing
    ? "Update Event"
    : "Create Event"}
</button>

        </div>

      </div>

<h1>
  {editing
    ? "Edit Event"
    : "Create Event"}
</h1>

      {events.map(
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
                deleteEvent(
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
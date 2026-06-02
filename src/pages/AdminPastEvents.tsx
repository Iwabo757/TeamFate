import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type EventBlock = {
  id: string;
  event_id: string;
  block_type: "text" | "image";
  content: string;
  display_order: number;
};

type EventPost = {
  id: string;
  title: string;
  description: string;
  prize: string;
  start_time: string;
  end_time: string;
  banner_url: string | null;

  first_place?: string;
  second_place?: string;
  third_place?: string;
  fourth_place?: string;
};

export default function AdminPastEvents() {

  const [events, setEvents] =
    useState<EventPost[]>([]);

const [editingEvent, setEditingEvent] =
  useState<EventPost | null>(null);

type Member = {
  id: string;
  nickname: string;
  avatar_url?: string;
};

const [members, setMembers] =
  useState<Member[]>([]);

const [firstPlace, setFirstPlace] =
  useState("");

const [secondPlace, setSecondPlace] =
  useState("");

const [thirdPlace, setThirdPlace] =
  useState("");

const [fourthPlace, setFourthPlace] =
  useState("");

  const [blocks, setBlocks] =
    useState<
      Record<string, EventBlock[]>
    >({});

  const [
    selectedEvent,
    setSelectedEvent,
  ] = useState<EventPost | null>(
    null
  );

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } =
      await supabase
        .from("events")
        .select("*")
        .order("start_time", {
          ascending: false,
        });

    if (!data) return;

    const now = new Date();

const { data: memberData } =
  await supabase
    .from("profiles")
    .select(`
      id,
      nickname,
      avatar_url
    `)
    .order("nickname");

setMembers(
  memberData || []
);

    const pastEvents =
      data.filter(
        (event) =>
          new Date(
            event.end_time
          ) <= now
      );

    setEvents(pastEvents);

    const eventIds =
      pastEvents.map(
        (e) => e.id
      );

    if (
      eventIds.length === 0
    )
      return;

    const {
      data: blockData,
    } = await supabase
      .from(
        "event_content_blocks"
      )
      .select("*")
      .in(
        "event_id",
        eventIds
      )
      .order(
        "display_order",
        {
          ascending: true,
        }
      );

    const grouped:
      Record<
        string,
        EventBlock[]
      > = {};

    blockData?.forEach(
      (block: any) => {
        if (
          !grouped[
            block.event_id
          ]
        ) {
          grouped[
            block.event_id
          ] = [];
        }

        grouped[
          block.event_id
        ].push(block);
      }
    );

    setBlocks(grouped);
  }

  function formatDate(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleString(
      undefined,
      {
        dateStyle:
          "long",
        timeStyle:
          "short",
      }
    );
  }

  function getPreviewImage(
    event: EventPost
  ) {
    const eventBlocks =
      blocks[event.id] || [];

    const firstImage =
      eventBlocks.find(
        (b) =>
          b.block_type ===
          "image"
      );

    return (
      firstImage?.content ||
      event.banner_url ||
      "/placeholder.png"
    );
  }

async function saveWinners() {
  if (!editingEvent) return;

  const payload = {
    first_place:
      firstPlace || null,
    second_place:
      secondPlace || null,
    third_place:
      thirdPlace || null,
    fourth_place:
      fourthPlace || null,
  };

  console.log(
    "SAVING WINNERS:",
    payload
  );

  const { error } =
    await supabase
      .from("events")
      .update(payload)
      .eq(
        "id",
        editingEvent.id
      );

  if (error) {
    console.error(error);

    alert(
      "Failed to save winners:\n" +
      error.message
    );

    return;
  }

  alert(
    "Winners saved successfully!"
  );

  await loadEvents();

  setEditingEvent(null);
}

  async function deleteEvent(
    eventId: string
  ) {
    const confirmed =
      window.confirm(
        "Delete this event?"
      );

    if (!confirmed) return;

    await supabase
      .from(
        "event_content_blocks"
      )
      .delete()
      .eq(
        "event_id",
        eventId
      );

    await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    loadEvents();
  }

  return (
    <div className="page">
      <h1>Past Events</h1>

      {events.length ===
        0 && (
        <div className="card">
          No past events.
        </div>
      )}

      <div className="event-grid">
        {events.map(
          (event) => (
            <div
              key={event.id}
              className="event-card"
            >
              <div
                onClick={() =>
                  setSelectedEvent(
                    event
                  )
                }
              >
                <img
                  src={getPreviewImage(
                    event
                  )}
                  alt={
                    event.title
                  }
                  className="event-card-image"
                />

                <div className="event-card-content">
                  <h3>
                    {
                      event.title
                    }
                  </h3>

                  <p>
                    {formatDate(
                      event.start_time
                    )}
                  </p>

                  <p>
                    Prize:{" "}
                    {
                      event.prize
                    }
                  </p>
                </div>
              </div>

              <div className="event-admin-actions">
      
<button
  className="edit-btn"
  onClick={() => {
    setEditingEvent(event);

    setFirstPlace(
      event.first_place || ""
    );

    setSecondPlace(
      event.second_place || ""
    );

    setThirdPlace(
      event.third_place || ""
    );

    setFourthPlace(
      event.fourth_place || ""
    );
  }}
>
  Edit Winners
</button>
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
            </div>
          )
        )}
      </div>

      {selectedEvent && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedEvent(null)
          }
        >
          <div
            className="event-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="close-btn"
              onClick={() =>
                setSelectedEvent(
                  null
                )
              }
            >
              ×
            </button>

            <h2>
              {
                selectedEvent.title
              }
            </h2>

            <p>
              <strong>
                Starts:
              </strong>{" "}
              {formatDate(
                selectedEvent.start_time
              )}
            </p>

            <p>
              <strong>
                Ends:
              </strong>{" "}
              {formatDate(
                selectedEvent.end_time
              )}
            </p>

            <p>
              <strong>
                Prize:
              </strong>{" "}
              {
                selectedEvent.prize
              }
            </p>

            <hr />

            {blocks[
              selectedEvent.id
            ]?.map(
              (block) => (
                <div
                  key={
                    block.id
                  }
                  style={{
                    marginBottom:
                      "20px",
                  }}
                >
                  {block.block_type ===
                  "text" ? (
                    <div
                      style={{
                        whiteSpace:
                          "pre-wrap",
                        lineHeight:
                          1.7,
                      }}
                    >
                      {
                        block.content
                      }
                    </div>
                  ) : (
                    <img
                      src={
                        block.content
                      }
                      alt=""
                      style={{
                        width:
                          "100%",
                        borderRadius:
                          "12px",
                      }}
                    />
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

{editingEvent && (
  <div
    className="modal-overlay"
    onClick={() =>
      setEditingEvent(null)
    }
  >
    <div
      className="event-modal"
      onClick={(e) =>
        e.stopPropagation()
      }
    >
      <h2 className="winner-title">
  🏆 Edit Event Winners
</h2>

<div className="winner-editor">
<select
  className="dex-select"
  value={firstPlace}
  onChange={(e) =>
    setFirstPlace(e.target.value)
  }
>
  <option value="">
    1st Place
  </option>

  {members.map(
    (member) => (
      <option
        key={member.id}
        value={member.id}
      >
        {member.nickname}
      </option>
    )
  )}
</select>

<select
  className="dex-select"
  value={secondPlace}
  onChange={(e) =>
    setSecondPlace(e.target.value)
  }
>
  <option value="">
    2nd Place
  </option>

  {members.map(
    (member) => (
      <option
        key={member.id}
        value={member.id}
      >
        {member.nickname}
      </option>
    )
  )}
</select>

<select
  className="dex-select"
  value={thirdPlace}
  onChange={(e) =>
    setThirdPlace(e.target.value)
  }
>
  <option value="">
    3rd Place
  </option>

  {members.map(
    (member) => (
      <option
        key={member.id}
        value={member.id}
      >
        {member.nickname}
      </option>
    )
  )}
</select>

<select
  className="dex-select"
  value={fourthPlace}
  onChange={(e) =>
    setFourthPlace(e.target.value)
  }
>
  <option value="">
    4th Place
  </option>

  {members.map(
    (member) => (
      <option
        key={member.id}
        value={member.id}
      >
        {member.nickname}
      </option>
    )
  )}

</select>

<button
  className="save-winners-btn"
  onClick={saveWinners}
>
  Save Winners
</button>
</div>
    </div>
  </div>
)}
    </div>
  );
}
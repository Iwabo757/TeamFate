import {
  useEffect,
  useState,
} from "react";

import { useSearchParams } from "react-router-dom";
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

  first_place_points?: number;
  first_place_prize?: string;

  second_place_points?: number;
  second_place_prize?: string;

  third_place_points?: number;
  third_place_prize?: string;

  fourth_place_points?: number;
  fourth_place_prize?: string;
};

export default function Events() {
  const [events, setEvents] =
    useState<EventPost[]>([]);

  const [blocks, setBlocks] =
    useState<
      Record<string, EventBlock[]>
    >({});

const [searchParams] =
  useSearchParams();

const [profiles, setProfiles] =
  useState<any[]>([]);

const [view, setView] =
  useState<"upcoming" | "past">(
    searchParams.get("view") ===
      "past"
      ? "past"
      : "upcoming"
  );

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

const { data: profileData } =
  await supabase
    .from("profiles")
    .select(`
      id,
      nickname,
      avatar_url
    `);

setProfiles(
  profileData || []
);

    const { data } =
      await supabase
        .from("events")
        .select("*")
        .order("start_time", {
          ascending: false,
        });

    if (!data) return;

    setEvents(data);

    const eventIds =
      data.map((e) => e.id);

    if (eventIds.length === 0)
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

    const grouped: Record<
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
        dateStyle: "long",
        timeStyle: "short",
      }
    );
  }

function getPreviewImage(
  event: EventPost
) {
  if (event.banner_url)
    return event.banner_url;

  const eventBlocks =
    blocks[event.id] || [];

  const firstImage =
    eventBlocks.find(
      (b) =>
        b.block_type === "image"
    );

  return (
    firstImage?.content ||
    "/placeholder.png"
  );
}

function getProfile(
  profileId?: string
) {
  return profiles.find(
    (p) => p.id === profileId
  );
}

  const now = new Date();

  const upcomingEvents =
    events.filter(
      (event) =>
        new Date(
          event.end_time
        ) > now
    );

  const pastEvents =
    events.filter(
      (event) =>
        new Date(
          event.end_time
        ) <= now
    );

  const displayedEvents =
    view === "upcoming"
      ? upcomingEvents
      : pastEvents;

  return (
    <div className="page">
      <h1>Team Fate Events</h1>

<div className="leaderboard-filters">
  <button
    className={`leader-filter ${
      view === "upcoming" ? "active" : ""
    }`}
    onClick={() => setView("upcoming")}
  >
    Current Events
  </button>

  <button
    className={`leader-filter ${
      view === "past" ? "active" : ""
    }`}
    onClick={() => setView("past")}
  >
    Past Events
  </button>
</div>

      {displayedEvents.length ===
        0 && (
        <div className="card">
          No {view} events.
        </div>
      )}

      <div className="event-grid">
        {displayedEvents.map(
          (event) => (
            <div
              key={event.id}
              className="event-card"
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
                alt={event.title}
                className="event-card-image"
              />

              <div className="event-card-content">
                <h3>
                  {event.title}
                </h3>

<div className="event-card-dates">
  <p>
    <strong>Starts:</strong>{" "}
    {formatDate(
      event.start_time
    )}
  </p>

  <p>
    <strong>Ends:</strong>{" "}
    {formatDate(
      event.end_time
    )}
  </p>

  <p>
    <strong>Prize:</strong>{" "}
    {event.prize}
  </p>
</div>
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
          setSelectedEvent(null)
        }
      >
        ×
      </button>

      {new Date(
        selectedEvent.end_time
      ) <= new Date() ? (
        <>
          <img
            src={getPreviewImage(
              selectedEvent
            )}
            className="results-banner"
            alt=""
          />

<h2
  style={{
    textAlign: "center",
    marginBottom: "20px",
  }}
>
  🏆 {selectedEvent.title} Results
</h2>

<div className="event-results">

{(() => {
  const profile = getProfile(
    selectedEvent.first_place
  );

  if (!profile) return null;

  return (
    <div className="winner-card first">
      <img
        src={profile.avatar_url}
        className="winner-avatar"
      />

      <div className="winner-medal">
        👑
      </div>

      <h3>Champion</h3>

      <div className="winner-name">
        {profile.nickname}
      </div>

      <div className="winner-points">
        {selectedEvent.first_place_points || 0}
        pts
      </div>

      <div className="winner-prize">
        🎁 {selectedEvent.first_place_prize}
      </div>
    </div>
  );
})()}

    
 {(() => {
  const profile = getProfile(
    selectedEvent.second_place
  );

  if (!profile) return null;

  return (
    <div className="winner-card second">
      <img
        src={profile.avatar_url}
        className="winner-avatar"
      />

      <div className="winner-medal">
        🥈
      </div>

      <h3>2nd Place</h3>

      <div className="winner-name">
        {profile.nickname}
      </div>

      <div className="winner-points">
        {selectedEvent.second_place_points || 0}
        pts
      </div>

      <div className="winner-prize">
        🎁 {selectedEvent.second_place_prize}
      </div>
    </div>
  );
})()}


 {(() => {
  const profile = getProfile(
    selectedEvent.third_place
  );

  if (!profile) return null;

  return (
    <div className="winner-card third">
      <img
        src={profile.avatar_url}
        className="winner-avatar"
      />

      <div className="winner-medal">
         🥉
      </div>

      <h3>3rd Place</h3>

      <div className="winner-name">
        {profile.nickname}
      </div>

      <div className="winner-points">
        {selectedEvent.third_place_points || 0}
        pts
      </div>

      <div className="winner-prize">
        🎁 {selectedEvent.third_place_prize}
      </div>
    </div>
  );
})()}


    
 {(() => {
  const profile = getProfile(
    selectedEvent.fourth_place
  );

  if (!profile) return null;

  return (
    <div className="winner-card fourth">
      <img
        src={profile.avatar_url}
        className="winner-avatar"
      />

      <div className="winner-medal">
         🏅 
      </div>

      <h3>4th Place</h3>

      <div className="winner-name">
        {profile.nickname}
      </div>

      <div className="winner-points">
        {selectedEvent.fourth_place_points || 0}
        pts
      </div>

      <div className="winner-prize">
        🎁 {selectedEvent.fourth_place_prize}
      </div>
    </div>
  );
})()}


</div>
        </>
      ) : (
        <>
          <h2>
            {selectedEvent.title}
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
            {selectedEvent.prize}
          </p>

          <hr />

          {blocks[
            selectedEvent.id
          ]?.map(
            (block) => (
              <div
                key={block.id}
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
                      lineHeight: 1.7,
                    }}
                  >
                    {block.content}
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
        </>
      )}
    </div>
  </div>
)}

    </div>
  );
}
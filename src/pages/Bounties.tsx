import {
  useEffect,
  useState,
} from "react";

import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type BountyBlock = {
  id: string;
  bounty_id: string;
  block_type: "text" | "image";
  content: string;
  display_order: number;
};

type BountyPost = {
  id: string;
  title: string;
  description: string;
  prize: string;
  start_time: string;
  end_time: string;
  banner_url: string | null;

claimed?: boolean;

claimed_by?: string;

claimed_at?: string;

};

export default function Bountys() {
  
const [bounties, setBountys] =
    useState<BountyPost[]>([]);

  const [blocks, setBlocks] =
    useState<
      Record<string, BountyBlock[]>
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
    selectedBounty,
    setSelectedBounty,
  ] = useState<BountyPost | null>(
    null
  );

  useEffect(() => {
    loadBounties();
  }, []);

async function loadBounties() {

const { data } = await supabase
  .from("bounties")
  .select("*")
  .order("start_time", {
    ascending: false,
  });

  setBountys(data || []);

  const { data: profileData } =
    await supabase
      .from("profiles")
      .select(`
        id,
        nickname,
        avatar_url
      `);

  setProfiles(profileData || []);

  if (!data) return;

  const eventIds =
    data.map((e) => e.id);

  if (eventIds.length === 0)
    return;

  const { data: blockData } =
    await supabase
      .from("bounty_content_blocks")
      .select("*")
      .in("bounty_id", eventIds)
      .order("display_order", {
        ascending: true,
      });

  const grouped: Record<
    string,
    BountyBlock[]
  > = {};

  blockData?.forEach((block: any) => {
    if (!grouped[block.bounty_id]) {
      grouped[block.bounty_id] = [];
    }

    grouped[block.bounty_id].push(
      block
    );
  });

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

function getPreviewImage(event: BountyPost) {
  const eventBlocks =
    blocks[event.id] || [];

  const firstImage =
    eventBlocks.find(
      (b) =>
        b.block_type === "image"
    );

  return (
    firstImage?.content ||
    event.banner_url ||
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

const upcomingBountys =
  bounties.filter(
    (event) =>
      new Date(
        event.end_time
      ) > now &&
      !event.claimed
  );

const pastBounties =
  bounties.filter(
    (event) =>
      event.claimed ||
      new Date(
        event.end_time
      ) <= now
  );


  const displayedBountys =
    view === "upcoming"
      ? upcomingBountys
      : pastBounties;

  return (
    <div className="page">
      <h1>Team Fate Bountys</h1>

<div className="leaderboard-filters">
  <button
    className={`leader-filter ${
      view === "upcoming" ? "active" : ""
    }`}
    onClick={() => setView("upcoming")}
  >
    Active Bountys
  </button>

  <button
    className={`leader-filter ${
      view === "past" ? "active" : ""
    }`}
    onClick={() => setView("past")}
  >
    Past Bountys
  </button>
</div>

      {displayedBountys.length ===
        0 && (
        <div className="card">
          No {view} bounties.
        </div>
      )}

      <div className="event-grid">
        {displayedBountys.map(
          (event) => (
            <div
              key={event.id}
              className="event-card"
              onClick={() =>
                setSelectedBounty(
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

{selectedBounty && (
  <div
    className="modal-overlay"
    onClick={() =>
      setSelectedBounty(null)
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
          setSelectedBounty(null)
        }
      >
        ×
      </button>

      {selectedBounty.claimed ||
 new Date(
   selectedBounty.end_time
 ) <= new Date() ? (

        <>
          <img
            src={getPreviewImage(
              selectedBounty
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
  🏆 {selectedBounty.title} Results
</h2>

<div className="event-results">

  {selectedBounty.claimed ? (
    (() => {
      const hunter =
        getProfile(
          selectedBounty.claimed_by
        );

      return (
        <div className="winner-card first">

          {hunter && (
            <img
              src={
                hunter.avatar_url
              }
              className="winner-avatar"
            />
          )}

          <div className="winner-medal">
            🎯
          </div>

          <h3>
            Bounty Claimed
          </h3>

          <div className="winner-name">
            {hunter?.nickname ||
              "Unknown Hunter"}
          </div>

          <div className="winner-prize">
            🎁 {
              selectedBounty.prize
            }
          </div>

          <p>
            Claimed:
            {" "}
            {formatDate(
              selectedBounty.claimed_at!
            )}
          </p>

        </div>
      );
    })()
  ) : (
    <div className="winner-card fourth">

      <div className="winner-medal">
        👻
      </div>

      <h3>
        Bounty Got Away
      </h3>

      <p>
        Nobody claimed this
        bounty before it
        expired.
      </p>

    </div>
  )}

</div>

        </>
      ) : (
        <>
          <h2>
            {selectedBounty.title}
          </h2>

          <p>
            <strong>
              Starts:
            </strong>{" "}
            {formatDate(
              selectedBounty.start_time
            )}
          </p>

          <p>
            <strong>
              Ends:
            </strong>{" "}
            {formatDate(
              selectedBounty.end_time
            )}
          </p>

          <p>
            <strong>
              Prize:
            </strong>{" "}
            {selectedBounty.prize}
          </p>

          <hr />

          {blocks[
            selectedBounty.id
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
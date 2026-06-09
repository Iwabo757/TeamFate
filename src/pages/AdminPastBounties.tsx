import { useEffect, useState } from "react";
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

export default function AdminPastBountys() {

  const [bounties, setBountys] =
    useState<BountyPost[]>([]);


type Member = {
  id: string;
  nickname: string;
  avatar_url?: string;
};

const [members, setMembers] =
  useState<Member[]>([]);





  const [blocks, setBlocks] =
    useState<
      Record<string, BountyBlock[]>
    >({});

  const [
    selectedBounty,
    setSelectedBounty,
  ] = useState<BountyPost | null>(
    null
  );

  useEffect(() => {
    loadBountys();
  }, []);

  async function loadBountys() {
    const { data } =
      await supabase
        .from("bounties")
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

const pastBountys =
  data.filter(
    (event) =>
      new Date(
        event.end_time
      ) <= now ||
      event.claimed
  );

    setBountys(pastBountys);

    const eventIds =
      pastBountys.map(
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
        "bounty_content_blocks"
      )
      .select("*")
      .in(
        "bounty_id",
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
        BountyBlock[]
      > = {};

    blockData?.forEach(
      (block: any) => {
        if (
          !grouped[
            block.bounty_id
          ]
        ) {
          grouped[
            block.bounty_id
          ] = [];
        }

        grouped[
          block.bounty_id
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
    event: BountyPost
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

function getMember(
  profileId?: string
) {
  return members.find(
    (m) => m.id === profileId
  );
}


  async function deleteBounty(
    eventId: string
  ) {
    const confirmed =
      window.confirm(
        "Delete this event?"
      );

    if (!confirmed) return;

    await supabase
      .from(
        "bounty_content_blocks"
      )
      .delete()
      .eq(
        "bounty_id",
        eventId
      );

    await supabase
      .from("bounties")
      .delete()
      .eq("id", eventId);

    loadBountys();
  }

  return (
    <div className="page">
      <h1>Past Bountys</h1>

      {bounties.length ===
        0 && (
        <div className="card">
          No past bounties.
        </div>
      )}

      <div className="event-grid">
        {bounties.map(
          (event) => (
            <div
              key={event.id}
              className="event-card"
            >
              <div
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
        {selectedBounty.title}
      </h2>

      {selectedBounty.claimed ? (
        <div className="winner-card first">
          <h2>
            🎯 Bounty Claimed
          </h2>

          {(() => {
            const hunter =
              getMember(
                selectedBounty.claimed_by
              );

            if (!hunter)
              return null;

            return (
              <>
                <img
                  src={
                    hunter.avatar_url
                  }
                  className="winner-avatar"
                />

                <h3>
                  {
                    hunter.nickname
                  }
                </h3>

                <p>
                  Claimed:
                  {" "}
                  {formatDate(
                    selectedBounty.claimed_at!
                  )}
                </p>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="winner-card fourth">
          <h2>
            👻 Bounty Got Away
          </h2>

          <p>
            Nobody claimed
            this bounty
            before it
            expired.
          </p>
        </div>
      )}

      <hr />

      {blocks[
        selectedBounty.id
      ]?.map((block) => (
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
      ))}
    </div>
  </div>
)}
    </div>
  );
}
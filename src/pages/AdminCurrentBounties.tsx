import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
};

export default function AdminCurrentBountys() {
  const navigate = useNavigate();

  const [bounties, setBountys] =
    useState<BountyPost[]>([]);

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

    const currentBountys =
      data.filter(
        (event) =>
          new Date(
            event.end_time
          ) > now
      );

    setBountys(currentBountys);

    const eventIds =
      currentBountys.map(
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
      <h1>
        Current Bountys
      </h1>

      {bounties.length ===
        0 && (
        <div className="card">
          No current bounties.
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
                  className="edit-btn"
                  onClick={() =>
                    navigate(
                      `/admin/bounties/edit/${event.id}`
                    )
                  }
                >
                  Edit
                </button>

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
                setSelectedBounty(
                  null
                )
              }
            >
              ×
            </button>

            <h2>
              {
                selectedBounty.title
              }
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
              {
                selectedBounty.prize
              }
            </p>

            <hr />

            {blocks[
              selectedBounty.id
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
    </div>
  );
}
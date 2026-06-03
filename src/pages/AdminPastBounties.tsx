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

export default function AdminPastBountys() {

  const [bounties, setBountys] =
    useState<BountyPost[]>([]);

const [editingBounty, setEditingBounty] =
  useState<BountyPost | null>(null);

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
const [firstPlacePoints, setFirstPlacePoints] =
  useState("");

const [firstPlacePrize, setFirstPlacePrize] =
  useState("");



const [secondPlacePoints, setSecondPlacePoints] =
  useState("");

const [secondPlacePrize, setSecondPlacePrize] =
  useState("");

const [thirdPlacePoints, setThirdPlacePoints] =
  useState("");

const [thirdPlacePrize, setThirdPlacePrize] =
  useState("");

const [fourthPlacePoints, setFourthPlacePoints] =
  useState("");

const [fourthPlacePrize, setFourthPlacePrize] =
  useState("");



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
          ) <= now
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

async function saveWinners() {
  if (!editingBounty) return;

const payload = {
  first_place: firstPlace,
  first_place_points:
    Number(firstPlacePoints) || 0,
  first_place_prize:
    firstPlacePrize,

  second_place: secondPlace,
  second_place_points:
    Number(secondPlacePoints) || 0,
  second_place_prize:
    secondPlacePrize,

  third_place: thirdPlace,
  third_place_points:
    Number(thirdPlacePoints) || 0,
  third_place_prize:
    thirdPlacePrize,

  fourth_place: fourthPlace,
  fourth_place_points:
    Number(fourthPlacePoints) || 0,
  fourth_place_prize:
    fourthPlacePrize,
};

  console.log(
    "SAVING WINNERS:",
    payload
  );

  const { error } =
    await supabase
      .from("bounties")
      .update(payload)
      .eq(
        "id",
        editingBounty.id
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

  await loadBountys();

  setEditingBounty(null);
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
  className="edit-btn"
onClick={() => {
  setEditingBounty(event);

  setFirstPlace(event.first_place || "");
  setSecondPlace(event.second_place || "");
  setThirdPlace(event.third_place || "");
  setFourthPlace(event.fourth_place || "");

  setFirstPlacePoints(
    String(event.first_place_points || "")
  );

  setFirstPlacePrize(
    event.first_place_prize || ""
  );

  setSecondPlacePoints(
    String(event.second_place_points || "")
  );

  setSecondPlacePrize(
    event.second_place_prize || ""
  );

  setThirdPlacePoints(
    String(event.third_place_points || "")
  );

  setThirdPlacePrize(
    event.third_place_prize || ""
  );

  setFourthPlacePoints(
    String(event.fourth_place_points || "")
  );

  setFourthPlacePrize(
    event.fourth_place_prize || ""
  );
}}
>
  Edit Winners
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

{editingBounty && (
  <div
    className="modal-overlay"
    onClick={() =>
      setEditingBounty(null)
    }
  >
    <div
      className="event-modal"
      onClick={(e) =>
        e.stopPropagation()
      }
    >
      <h2 className="winner-title">
  🏆 Edit Bounty Winners
</h2>

<div className="winner-editor">

  {/* 1st */}
  <select
    className="dex-select"
    value={firstPlace}
    onChange={(e) =>
      setFirstPlace(e.target.value)
    }
  >
    <option value="">1st Place</option>
    {members.map((member) => (
      <option
        key={member.id}
        value={member.id}
      >
        {member.nickname}
      </option>
    ))}
  </select>

  <input
    type="number"
    className="dex-select"
    placeholder="Points"
    value={firstPlacePoints}
    onChange={(e) =>
      setFirstPlacePoints(
        e.target.value
      )
    }
  />

  <input
    type="text"
    className="dex-select"
    placeholder="Prize Won"
    value={firstPlacePrize}
    onChange={(e) =>
      setFirstPlacePrize(
        e.target.value
      )
    }
  />

  {/* 2nd */}
  <select
    className="dex-select"
    value={secondPlace}
    onChange={(e) =>
      setSecondPlace(e.target.value)
    }
  >
    <option value="">2nd Place</option>
    {members.map((member) => (
      <option
        key={member.id}
        value={member.id}
      >
        {member.nickname}
      </option>
    ))}
  </select>

  <input
    type="number"
    className="dex-select"
    placeholder="Points"
    value={secondPlacePoints}
    onChange={(e) =>
      setSecondPlacePoints(
        e.target.value
      )
    }
  />

  <input
    type="text"
    className="dex-select"
    placeholder="Prize Won"
    value={secondPlacePrize}
    onChange={(e) =>
      setSecondPlacePrize(
        e.target.value
      )
    }
  />

  {/* 3rd */}
  <select
    className="dex-select"
    value={thirdPlace}
    onChange={(e) =>
      setThirdPlace(e.target.value)
    }
  >
    <option value="">3rd Place</option>
    {members.map((member) => (
      <option
        key={member.id}
        value={member.id}
      >
        {member.nickname}
      </option>
    ))}
  </select>

  <input
    type="number"
    className="dex-select"
    placeholder="Points"
    value={thirdPlacePoints}
    onChange={(e) =>
      setThirdPlacePoints(
        e.target.value
      )
    }
  />

  <input
    type="text"
    className="dex-select"
    placeholder="Prize Won"
    value={thirdPlacePrize}
    onChange={(e) =>
      setThirdPlacePrize(
        e.target.value
      )
    }
  />

  {/* 4th */}
  <select
    className="dex-select"
    value={fourthPlace}
    onChange={(e) =>
      setFourthPlace(e.target.value)
    }
  >
    <option value="">4th Place</option>
    {members.map((member) => (
      <option
        key={member.id}
        value={member.id}
      >
        {member.nickname}
      </option>
    ))}
  </select>

  <input
    type="number"
    className="dex-select"
    placeholder="Points"
    value={fourthPlacePoints}
    onChange={(e) =>
      setFourthPlacePoints(
        e.target.value
      )
    }
  />

  <input
    type="text"
    className="dex-select"
    placeholder="Prize Won"
    value={fourthPlacePrize}
    onChange={(e) =>
      setFourthPlacePrize(
        e.target.value
      )
    }
  />

  {/* 3rd and 4th continue the same way */}

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
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type EventBlock = {
  id: string;
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
};

export default function Events() {
  const [events, setEvents] =
    useState<EventPost[]>([]);

  const [blocks, setBlocks] =
    useState<
      Record<
        string,
        EventBlock[]
      >
    >({});

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } =
      await supabase
        .from("events")
        .select("*")
        .order(
          "start_time",
          {
            ascending:
              false,
          }
        );

    if (!data) return;

    setEvents(data);

    const eventIds =
      data.map(
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
          ascending:
            true,
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

  return (
    <div className="page">

      <h1>
        Team Fate Events
      </h1>

      {events.length ===
        0 && (
        <div className="card">
          No events found.
        </div>
      )}

      {events.map(
        (event) => (
          <div
            key={event.id}
            className="card"
            style={{
              marginBottom:
                "30px",
            }}
          >
            {event.banner_url && (
              <img
                src={
                  event.banner_url
                }
                alt={
                  event.title
                }
                style={{
                  width:
                    "100%",
                  borderRadius:
                    "12px",
                  marginBottom:
                    "20px",
                }}
              />
            )}

            <h2>
              {
                event.title
              }
            </h2>

            <p>
              <strong>
                Starts:
              </strong>{" "}
              {formatDate(
                event.start_time
              )}
            </p>

            <p>
              <strong>
                Ends:
              </strong>{" "}
              {formatDate(
                event.end_time
              )}
            </p>

            <p>
              <strong>
                Prize:
              </strong>{" "}
              {
                event.prize
              }
            </p>

            <hr
              style={{
                margin:
                  "20px 0",
              }}
            />

            {blocks[
              event.id
            ]?.map(
              (
                block
              ) => (
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
        )
      )}

    </div>
  );
}
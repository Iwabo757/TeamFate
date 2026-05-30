import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Event = {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  prize: string;
};

export default function Events() {
  const [events, setEvents] =
    useState<Event[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data, error } =
      await supabase
        .from("events")
        .select("*")
        .order("start_time");

    if (error) {
      console.error(error);
      return;
    }

    setEvents(data || []);
  }

  const formatDate = (
    value: string
  ) =>
    new Date(value).toLocaleString(
      undefined,
      {
        dateStyle: "long",
        timeStyle: "short",
      }
    );

  return (
    <div className="page">
      <h1>📅 Events</h1>

      {events.length === 0 && (
        <p>No active events.</p>
      )}

      {events.map((event) => (
        <div
          key={event.id}
          className="card"
        >
          <h2>{event.title}</h2>

          <p>
            {event.description}
          </p>

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
            {event.prize}
          </p>
        </div>
      ))}
    </div>
  );
}
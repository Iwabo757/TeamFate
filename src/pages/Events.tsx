import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Event = {
  id: string;
  title: string;
  description: string;
  start_time: string | null;
  end_time: string | null;
  prize: string;
};

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", {
        ascending: true,
      });

    console.log("EVENT DATA:", data);
    console.log("EVENT ERROR:", error);

    if (error) {
      console.error(error);
      return;
    }

    setEvents(data || []);
    setLoading(false);
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) return "Not Set";

    return new Date(value).toLocaleString(
      undefined,
      {
        dateStyle: "long",
        timeStyle: "short",
      }
    );
  }

  return (
    <div className="page">
      <h1>📅 Events</h1>

      {loading && (
        <p>Loading events...</p>
      )}

      {!loading &&
        events.length === 0 && (
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
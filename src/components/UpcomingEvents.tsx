import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Event = {
  id: string;
  title: string;
  description: string | null;
  prize: string | null;
  start_time: string;
  end_time: string | null;
  banner_url: string | null;
};

export default function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("start_time", now)
        .order("start_time", {
          ascending: true,
        })
        .limit(5);

      if (error) throw error;

      setEvents(data || []);
    } catch (err) {
      console.error(
        "Failed loading events:",
        err
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="recent-finds">
      <h2>Upcoming Events</h2>

      {loading ? (
        <p>Loading events...</p>
      ) : events.length === 0 ? (
        <p>No upcoming events.</p>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            className="find-item"
          >
            <strong>
              {event.title}
            </strong>

            <p>
              {new Date(
                event.start_time
              ).toLocaleString()}
            </p>

            {event.prize && (
              <p>
                🏆 Prize: {event.prize}
              </p>
            )}

            {event.description && (
              <small>
                {event.description}
              </small>
            )}
          </div>
        ))
      )}
    </div>
  );
}
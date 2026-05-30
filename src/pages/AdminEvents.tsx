import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminEvents() {
  const [events, setEvents] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [prize, setPrize] =
    useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setEvents(data || []);
  }

  async function createEvent() {
    const { error } = await supabase
      .from("events")
      .insert({
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        prize,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setPrize("");

    loadEvents();
  }

async function deleteEvent(id: string) {
  if (
    !window.confirm(
      "Delete this event?"
    )
  ) {
    return;
  }

  const { error } =
    await supabase
      .from("events")
      .delete()
      .eq("id", id);

  if (error) {
    alert(error.message);
    console.error(error);
    return;
  }

  loadEvents();
}

  return (
    <div className="page">

      <h1>Create Event</h1>

<div className="card">
  <div className="admin-form">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
        />

        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) =>
            setStartTime(
              e.target.value
            )
          }
        />

        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) =>
            setEndTime(
              e.target.value
            )
          }
        />

        <input
          placeholder="Prize"
          value={prize}
          onChange={(e) =>
            setPrize(
              e.target.value
            )
          }
        />

<button
  className="submit-btn"
  onClick={createEvent}
>
  Create Event
</button>

      </div>
</div>
      <h2>Existing Events</h2>

      {events.map((event) => (
        <div
          key={event.id}
          className="card"
        >
          <h3>{event.title}</h3>

<p>{event.description}</p>

<p>
  <strong>Starts:</strong>{" "}
  {new Date(
    event.start_time
  ).toLocaleString()}
</p>

<p>
  <strong>Ends:</strong>{" "}
  {new Date(
    event.end_time
  ).toLocaleString()}
</p>

<p>
  <strong>Prize:</strong>{" "}
  {event.prize}
</p>
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
      ))}

    </div>
  );
}
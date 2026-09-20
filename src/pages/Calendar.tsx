import { useMemo, useState } from "react";
import "./Calendar.css";

type EventStatus = "planning" | "ready" | "scheduled" | "completed";
type EventType =
  | "Weekly Catch Event"
  | "Tournament"
  | "Shiny Hunt"
  | "Hide & Seek"
  | "Special Event";

type CalendarEvent = {
  id: string;
  title: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime?: string;
  pokemon?: string;
  location?: string;
  channel?: string;
  prize?: string;
  assignedTo?: string;
  status: EventStatus;
  notes?: string;
  checklist: {
    pokemon: boolean;
    location: boolean;
    time: boolean;
    prize: boolean;
    banner: boolean;
    discordPost: boolean;
    website: boolean;
  };
};

const STAFF = ["Nick", "Officer", "Commander", "Leader"];

const seedEvents: CalendarEvent[] = [
  {
    id: "demo-1",
    title: "Weekly Catch Event",
    type: "Weekly Catch Event",
    date: "2026-09-20",
    startTime: "13:00",
    pokemon: "Piplup",
    location: "TBD",
    channel: "Channel 5",
    prize: "TBD",
    assignedTo: "Nick",
    status: "planning",
    notes: "Prepare banner, prize image, and Discord post.",
    checklist: {
      pokemon: true,
      location: false,
      time: true,
      prize: false,
      banner: false,
      discordPost: false,
      website: false,
    },
  },
];

const emptyEvent = (date: string): CalendarEvent => ({
  id: crypto.randomUUID(),
  title: "",
  type: "Weekly Catch Event",
  date,
  startTime: "13:00",
  endTime: "",
  pokemon: "",
  location: "",
  channel: "Channel 5",
  prize: "",
  assignedTo: "",
  status: "planning",
  notes: "",
  checklist: {
    pokemon: false,
    location: false,
    time: false,
    prize: false,
    banner: false,
    discordPost: false,
    website: false,
  },
});

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function checklistCount(event: CalendarEvent) {
  return Object.values(event.checklist).filter(Boolean).length;
}

export default function Calendar() {
  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [events, setEvents] = useState<CalendarEvent[]>(seedEvents);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");

  const days = useMemo(
    () => monthDays(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const filteredEvents = events.filter(
    (event) =>
      (statusFilter === "all" || event.status === statusFilter) &&
      (typeFilter === "all" || event.type === typeFilter),
  );

  const selected = events.find((event) => event.id === selectedId) ?? null;

  function updateEvent(id: string, patch: Partial<CalendarEvent>) {
    setEvents((current) =>
      current.map((event) =>
        event.id === id ? { ...event, ...patch } : event,
      ),
    );
  }

  function createEvent(date: string) {
    const event = emptyEvent(date);
    setEvents((current) => [...current, event]);
    setSelectedId(event.id);
  }

  function duplicateEvent(event: CalendarEvent) {
    const copy = {
      ...event,
      id: crypto.randomUUID(),
      title: `${event.title || event.type} Copy`,
      status: "planning" as EventStatus,
      date: event.date,
      checklist: { ...event.checklist },
    };
    setEvents((current) => [...current, copy]);
    setSelectedId(copy.id);
  }

  function deleteEvent(id: string) {
    setEvents((current) => current.filter((event) => event.id !== id));
    setSelectedId(null);
  }

  function changeMonth(amount: number) {
    setCursor(
      (current) => new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  }

  const monthTitle = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <div>
          <div className="calendar-kicker">TEAM FATÉ • STAFF</div>
          <h1>Event Calendar</h1>
          <p>Plan, prepare, and schedule upcoming Team Faté events.</p>
        </div>

        <button
          className="calendar-primary"
          onClick={() => createEvent(dateKey(cursor.getFullYear(), cursor.getMonth(), today.getDate()))}
        >
          + New Event
        </button>
      </div>

      <div className="calendar-toolbar">
        <div className="calendar-month-nav">
          <button onClick={() => changeMonth(-1)}>‹</button>
          <button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>
            Today
          </button>
          <button onClick={() => changeMonth(1)}>›</button>
          <strong>{monthTitle}</strong>
        </div>

        <div className="calendar-filters">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as EventStatus | "all")
            }
          >
            <option value="all">All statuses</option>
            <option value="planning">Planning</option>
            <option value="ready">Ready</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as EventType | "all")
            }
          >
            <option value="all">All event types</option>
            <option>Weekly Catch Event</option>
            <option>Tournament</option>
            <option>Shiny Hunt</option>
            <option>Hide & Seek</option>
            <option>Special Event</option>
          </select>
        </div>
      </div>

      <div className="calendar-layout">
        <section className="calendar-card">
          <div className="calendar-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {days.map((day) => {
              const key = dateKey(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
              );
              const dayEvents = filteredEvents.filter((event) => event.date === key);
              const isCurrentMonth = day.getMonth() === cursor.getMonth();
              const isToday =
                day.toDateString() === today.toDateString();

              return (
                <button
                  key={key}
                  className={`calendar-day ${!isCurrentMonth ? "outside" : ""} ${
                    isToday ? "today" : ""
                  }`}
                  onClick={() => createEvent(key)}
                >
                  <span className="day-number">{day.getDate()}</span>

                  <div className="day-events">
                    {dayEvents.slice(0, 4).map((event) => (
                      <span
                        key={event.id}
                        className={`calendar-event ${event.status}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(event.id);
                        }}
                      >
                        <b>{event.startTime}</b> {event.title || event.type}
                      </span>
                    ))}
                    {dayEvents.length > 4 && (
                      <span className="more-events">
                        +{dayEvents.length - 4} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="calendar-sidebar">
          {selected ? (
            <>
              <div className="event-editor-header">
                <div>
                  <span className="calendar-kicker">EVENT PLANNING</span>
                  <h2>{selected.title || "New Event"}</h2>
                </div>
                <button onClick={() => setSelectedId(null)}>×</button>
              </div>

              <label>
                Event Name
                <input
                  value={selected.title}
                  placeholder="Weekly Catch Event"
                  onChange={(e) =>
                    updateEvent(selected.id, { title: e.target.value })
                  }
                />
              </label>

              <label>
                Event Type
                <select
                  value={selected.type}
                  onChange={(e) =>
                    updateEvent(selected.id, {
                      type: e.target.value as EventType,
                    })
                  }
                >
                  <option>Weekly Catch Event</option>
                  <option>Tournament</option>
                  <option>Shiny Hunt</option>
                  <option>Hide & Seek</option>
                  <option>Special Event</option>
                </select>
              </label>

              <div className="form-two">
                <label>
                  Date
                  <input
                    type="date"
                    value={selected.date}
                    onChange={(e) =>
                      updateEvent(selected.id, { date: e.target.value })
                    }
                  />
                </label>
                <label>
                  Start
                  <input
                    type="time"
                    value={selected.startTime}
                    onChange={(e) =>
                      updateEvent(selected.id, { startTime: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form-two">
                <label>
                  Pokémon
                  <input
                    value={selected.pokemon ?? ""}
                    placeholder="Piplup"
                    onChange={(e) =>
                      updateEvent(selected.id, { pokemon: e.target.value })
                    }
                  />
                </label>
                <label>
                  Status
                  <select
                    value={selected.status}
                    onChange={(e) =>
                      updateEvent(selected.id, {
                        status: e.target.value as EventStatus,
                      })
                    }
                  >
                    <option value="planning">Planning</option>
                    <option value="ready">Ready</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
              </div>

              <div className="form-two">
                <label>
                  Location
                  <input
                    value={selected.location ?? ""}
                    placeholder="Chargestone Cave"
                    onChange={(e) =>
                      updateEvent(selected.id, { location: e.target.value })
                    }
                  />
                </label>
                <label>
                  Channel
                  <input
                    value={selected.channel ?? ""}
                    placeholder="Channel 5"
                    onChange={(e) =>
                      updateEvent(selected.id, { channel: e.target.value })
                    }
                  />
                </label>
              </div>

              <label>
                Prize
                <input
                  value={selected.prize ?? ""}
                  placeholder="Prize details"
                  onChange={(e) =>
                    updateEvent(selected.id, { prize: e.target.value })
                  }
                />
              </label>

              <label>
                Assigned Staff
                <select
                  value={selected.assignedTo ?? ""}
                  onChange={(e) =>
                    updateEvent(selected.id, { assignedTo: e.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {STAFF.map((staff) => (
                    <option key={staff}>{staff}</option>
                  ))}
                </select>
              </label>

              <label>
                Internal Notes
                <textarea
                  value={selected.notes ?? ""}
                  placeholder="Staff-only planning notes..."
                  onChange={(e) =>
                    updateEvent(selected.id, { notes: e.target.value })
                  }
                />
              </label>

              <div className="checklist">
                <div className="checklist-title">Setup Checklist</div>
                {(
                  [
                    ["pokemon", "Pokémon selected"],
                    ["location", "Location confirmed"],
                    ["time", "Date / time confirmed"],
                    ["prize", "Prize confirmed"],
                    ["banner", "Event banner ready"],
                    ["discordPost", "Discord post ready"],
                    ["website", "Website event ready"],
                  ] as const
                ).map(([key, label]) => (
                  <label className="check-item" key={key}>
                    <input
                      type="checkbox"
                      checked={selected.checklist[key]}
                      onChange={(e) =>
                        updateEvent(selected.id, {
                          checklist: {
                            ...selected.checklist,
                            [key]: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}

                <div className="progress-label">
                  {checklistCount(selected)}/7 complete
                </div>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${(checklistCount(selected) / 7) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="event-actions">
                <button onClick={() => duplicateEvent(selected)}>
                  Duplicate
                </button>
                <button
                  className="danger"
                  onClick={() => deleteEvent(selected.id)}
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            <div className="calendar-empty">
              <span className="calendar-kicker">STAFF PLANNER</span>
              <h2>Plan the next event.</h2>
              <p>
                Click any day to create an event, or select an existing event
                to manage its setup.
              </p>
              <button
                className="calendar-primary"
                onClick={() =>
                  createEvent(
                    dateKey(cursor.getFullYear(), cursor.getMonth(), 1),
                  )
                }
              >
                + Create Event
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

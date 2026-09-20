import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import "./Calendar.css";

type EventStatus = "planning" | "ready" | "scheduled" | "completed" | "cancelled";
type EventType =
  | "Weekly Catch Event"
  | "Tournament"
  | "Shiny Hunt"
  | "Hide & Seek"
  | "Special Event"
  | "Announcement";

type StaffMember = {
  id: string;
  name: string;
  role: string;
};

type Checklist = {
  pokemon: boolean;
  location: boolean;
  time: boolean;
  prize: boolean;
  banner: boolean;
  discordPost: boolean;
  website: boolean;
};

type CalendarEvent = {
  id: string;
  planId?: string;
  publicEventId?: string;
  title: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime?: string;
  pokemon?: string;
  location?: string;
  channel?: string;
  prize?: string;
  assignedTo?: string;
  assignedStaffId?: string;
  status: EventStatus;
  notes?: string;
  description?: string;
  checklist: Checklist;
};

const STAFF_ROLES = ["officer", "commander", "leader", "admin"];

const emptyChecklist = (): Checklist => ({
  pokemon: false,
  location: false,
  time: false,
  prize: false,
  banner: false,
  discordPost: false,
  website: false,
});

const emptyEvent = (date: string): CalendarEvent => ({
  id: crypto.randomUUID(),
  title: "",
  type: "Weekly Catch Event",
  date,
  startTime: "13:00",
  endTime: "14:00",
  pokemon: "",
  location: "",
  channel: "Channel 5",
  prize: "",
  assignedTo: "",
  assignedStaffId: "",
  status: "planning",
  notes: "",
  description: "",
  checklist: emptyChecklist(),
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

function normalizeStatus(value: unknown): EventStatus {
  if (value === "ready" || value === "scheduled" || value === "completed" || value === "cancelled") {
    return value;
  }
  return "planning";
}

function normalizeType(value: unknown): EventType {
  const types: EventType[] = [
    "Weekly Catch Event",
    "Tournament",
    "Shiny Hunt",
    "Hide & Seek",
    "Special Event",
    "Announcement",
  ];
  return types.includes(value as EventType) ? (value as EventType) : "Special Event";
}

function formatTime(value?: string) {
  if (!value) return "";
  const [hour, minute] = value.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function fromPublicEvent(row: any): CalendarEvent {
  const start = row.start_time ? new Date(row.start_time) : new Date();
  const end = row.end_time ? new Date(row.end_time) : new Date(start.getTime() + 60 * 60 * 1000);
  return {
    id: `public-${row.id}`,
    publicEventId: String(row.id),
    title: row.title || "Untitled Event",
    type: "Special Event",
    date: dateKey(start.getFullYear(), start.getMonth(), start.getDate()),
    startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
    endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
    prize: row.prize || "",
    status: "scheduled",
    description: row.description || "",
    checklist: {
      pokemon: false,
      location: false,
      time: true,
      prize: Boolean(row.prize),
      banner: Boolean(row.banner_url),
      discordPost: false,
      website: true,
    },
  };
}

export default function Calendar() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

  async function loadCalendar() {
    setLoading(true);
    setMessage("");

    const [{ data: planRows, error: planError }, { data: eventRows, error: eventError }, { data: staffRows, error: staffError }] =
      await Promise.all([
        supabase.from("event_plans").select("*").order("event_date", { ascending: true }),
        supabase.from("events").select("*").order("start_time", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, nickname, username, discord_name, role")
          .in("role", STAFF_ROLES)
          .order("nickname", { ascending: true }),
      ]);

    if (planError && planError.code !== "42P01") {
      setMessage(planError.message);
    }

    const members: StaffMember[] = (staffRows || []).map((row: any) => ({
      id: row.id,
      name: row.nickname || row.username || row.discord_name || "Unnamed Staff",
      role: row.role || "",
    }));
    setStaff(members);

    const plans: CalendarEvent[] = (planRows || []).map((row: any) => ({
      id: `plan-${row.id}`,
      planId: String(row.id),
      publicEventId: row.public_event_id ? String(row.public_event_id) : undefined,
      title: row.title || "",
      type: normalizeType(row.event_type),
      date: row.event_date,
      startTime: row.start_time || "13:00",
      endTime: row.end_time || "14:00",
      pokemon: row.pokemon || "",
      location: row.location || "",
      channel: row.channel || "Channel 5",
      prize: row.prize || "",
      assignedTo: row.assigned_staff_name || "",
      assignedStaffId: row.assigned_staff_id || "",
      status: normalizeStatus(row.status),
      notes: row.internal_notes || "",
      description: row.description || "",
      checklist: row.checklist || emptyChecklist(),
    }));

    const plannedPublicIds = new Set(plans.map((event) => event.publicEventId).filter(Boolean));
    const publicEvents = (eventRows || [])
      .filter((row: any) => !plannedPublicIds.has(String(row.id)))
      .map(fromPublicEvent);

    setEvents([...plans, ...publicEvents]);
    setLoading(false);

    if (staffError) {
      setMessage(`Staff could not be loaded: ${staffError.message}`);
    } else if (eventError) {
      setMessage(`Public events could not be loaded: ${eventError.message}`);
    }
  }

  useEffect(() => {
    void loadCalendar();
  }, []);

  function updateEvent(id: string, patch: Partial<CalendarEvent>) {
    setEvents((current) =>
      current.map((event) => (event.id === id ? { ...event, ...patch } : event)),
    );
  }

  function createEvent(date: string) {
    const event = emptyEvent(date);
    setEvents((current) => [...current, event]);
    setSelectedId(event.id);
    setMessage("");
  }

  function duplicateEvent(event: CalendarEvent) {
    const copy = {
      ...event,
      id: crypto.randomUUID(),
      planId: undefined,
      publicEventId: undefined,
      title: `${event.title || event.type} Copy`,
      status: "planning" as EventStatus,
      checklist: { ...event.checklist },
    };
    setEvents((current) => [...current, copy]);
    setSelectedId(copy.id);
  }

  async function savePlanningEvent() {
    if (!selected) return;
    if (!selected.title.trim()) {
      setMessage("Give the event a title before saving.");
      return;
    }
    if (!selected.date || !selected.startTime) {
      setMessage("Date and start time are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      title: selected.title.trim(),
      event_type: selected.type,
      event_date: selected.date,
      start_time: selected.startTime,
      end_time: selected.endTime || "",
      pokemon: selected.pokemon || "",
      location: selected.location || "",
      channel: selected.channel || "",
      prize: selected.prize || "",
      assigned_staff_id: selected.assignedStaffId || null,
      assigned_staff_name: selected.assignedTo || "",
      status: selected.status,
      internal_notes: selected.notes || "",
      description: selected.description || "",
      checklist: selected.checklist,
    };

    const result = selected.planId
      ? await supabase.from("event_plans").update(payload).eq("id", selected.planId).select().single()
      : await supabase.from("event_plans").insert(payload).select().single();

    if (result.error) {
      setMessage(`Could not save: ${result.error.message}`);
      setSaving(false);
      return;
    }

    const savedId = String(result.data.id);
    setEvents((current) =>
      current.map((event) =>
        event.id === selected.id
          ? { ...event, id: `plan-${savedId}`, planId: savedId }
          : event,
      ),
    );
    setSelectedId(`plan-${savedId}`);
    setMessage("Event saved to the staff planning calendar.");
    setSaving(false);
  }

  async function deleteEvent(event: CalendarEvent) {
    if (!event.planId) {
      setMessage("Published events are managed from the Events dashboard.");
      return;
    }
    if (!window.confirm("Delete this planning event?")) return;

    const { error } = await supabase.from("event_plans").delete().eq("id", event.planId);
    if (error) {
      setMessage(`Could not delete: ${error.message}`);
      return;
    }
    setEvents((current) => current.filter((item) => item.id !== event.id));
    setSelectedId(null);
    setMessage("Planning event deleted.");
  }

  function changeMonth(amount: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function selectStaff(staffId: string) {
    const member = staff.find((item) => item.id === staffId);
    updateEvent(selected!.id, {
      assignedStaffId: staffId,
      assignedTo: member?.name || "",
    });
  }

  const monthTitle = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

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
          onClick={() => createEvent(dateKey(cursor.getFullYear(), cursor.getMonth(), Math.min(today.getDate(), new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate())))}
        >
          + New Event
        </button>
      </div>

      <div className="calendar-toolbar">
        <div className="calendar-month-nav">
          <button type="button" onClick={() => changeMonth(-1)}>‹</button>
          <button type="button" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button>
          <button type="button" onClick={() => changeMonth(1)}>›</button>
          <strong>{monthTitle}</strong>
        </div>
        <div className="calendar-filters">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as EventStatus | "all")}>
            <option value="all">All statuses</option>
            <option value="planning">Planning</option>
            <option value="ready">Ready</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as EventType | "all")}>
            <option value="all">All event types</option>
            <option>Weekly Catch Event</option>
            <option>Tournament</option>
            <option>Shiny Hunt</option>
            <option>Hide & Seek</option>
            <option>Special Event</option>
            <option>Announcement</option>
          </select>
        </div>
      </div>

      {message && <div className="calendar-message">{message}</div>}

      <div className="calendar-layout">
        <section className="calendar-card">
          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="calendar-grid">
            {days.map((day) => {
              const key = dateKey(day.getFullYear(), day.getMonth(), day.getDate());
              const dayEvents = filteredEvents.filter((event) => event.date === key);
              const isCurrentMonth = day.getMonth() === cursor.getMonth();
              const isToday = day.toDateString() === today.toDateString();
              return (
                <button
                  type="button"
                  key={key}
                  className={`calendar-day ${!isCurrentMonth ? "outside" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => createEvent(key)}
                >
                  <span className="day-number">{day.getDate()}</span>
                  <div className="day-events">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={`calendar-event ${event.status}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(event.id);
                        }}
                      >
                        <b>{formatTime(event.startTime)}</b> {event.title || event.type}
                      </span>
                    ))}
                    {dayEvents.length > 3 && <span className="more-events">+{dayEvents.length - 3} more</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {loading && <div className="calendar-loading">Loading calendar…</div>}
        </section>

        <aside className="calendar-sidebar">
          {selected ? (
            <>
              <div className="event-editor-header">
                <div>
                  <span className="calendar-kicker">EVENT PLANNING</span>
                  <h2>{selected.title || "New Event"}</h2>
                </div>
                <button type="button" onClick={() => setSelectedId(null)}>×</button>
              </div>

              <label>Event Name<input value={selected.title} placeholder="Weekly Catch Event" onChange={(e) => updateEvent(selected.id, { title: e.target.value })} /></label>
              <label>Event Type
                <select value={selected.type} onChange={(e) => updateEvent(selected.id, { type: e.target.value as EventType })}>
                  <option>Weekly Catch Event</option><option>Tournament</option><option>Shiny Hunt</option><option>Hide & Seek</option><option>Special Event</option><option>Announcement</option>
                </select>
              </label>

              <div className="form-two">
                <label>Date<input type="date" value={selected.date} onChange={(e) => updateEvent(selected.id, { date: e.target.value })} /></label>
                <label>Start (CT)<input type="time" value={selected.startTime} onChange={(e) => updateEvent(selected.id, { startTime: e.target.value })} /></label>
              </div>
              <div className="form-two">
                <label>End (CT)<input type="time" value={selected.endTime || ""} onChange={(e) => updateEvent(selected.id, { endTime: e.target.value })} /></label>
                <label>Status<select value={selected.status} onChange={(e) => updateEvent(selected.id, { status: e.target.value as EventStatus })}><option value="planning">Planning</option><option value="ready">Ready</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
              </div>
              <div className="form-two">
                <label>Pokémon<input value={selected.pokemon || ""} placeholder="Piplup" onChange={(e) => updateEvent(selected.id, { pokemon: e.target.value })} /></label>
                <label>Channel<input value={selected.channel || ""} placeholder="Channel 5" onChange={(e) => updateEvent(selected.id, { channel: e.target.value })} /></label>
              </div>
              <label>Location<input value={selected.location || ""} placeholder="Chargestone Cave" onChange={(e) => updateEvent(selected.id, { location: e.target.value })} /></label>
              <label>Prize<input value={selected.prize || ""} placeholder="Prize details" onChange={(e) => updateEvent(selected.id, { prize: e.target.value })} /></label>
              <label>Assigned Staff
                <select value={selected.assignedStaffId || ""} onChange={(e) => selectStaff(e.target.value)}>
                  <option value="">Unassigned</option>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.name} — {member.role}</option>)}
                </select>
              </label>
              <label>Description<textarea value={selected.description || ""} placeholder="Public event description..." onChange={(e) => updateEvent(selected.id, { description: e.target.value })} /></label>
              <label>Internal Notes<textarea value={selected.notes || ""} placeholder="Staff-only planning notes..." onChange={(e) => updateEvent(selected.id, { notes: e.target.value })} /></label>

              <div className="checklist">
                <div className="checklist-title">Setup Checklist</div>
                {([
                  ["pokemon", "Pokémon selected"], ["location", "Location confirmed"], ["time", "Date / time confirmed"], ["prize", "Prize confirmed"], ["banner", "Event banner ready"], ["discordPost", "Discord post ready"], ["website", "Website event ready"],
                ] as const).map(([key, label]) => (
                  <label className="check-item" key={key}>
                    <input type="checkbox" checked={selected.checklist[key]} onChange={(e) => updateEvent(selected.id, { checklist: { ...selected.checklist, [key]: e.target.checked } })} />
                    <span>{label}</span>
                  </label>
                ))}
                <div className="progress-label">{checklistCount(selected)}/7 complete</div>
                <div className="progress-track"><span style={{ width: `${(checklistCount(selected) / 7) * 100}%` }} /></div>
              </div>

              <div className="event-actions">
                <button type="button" className="calendar-save" disabled={saving} onClick={() => void savePlanningEvent()}>{saving ? "Saving…" : "Save Planning Event"}</button>
                <button type="button" onClick={() => duplicateEvent(selected)}>Duplicate</button>
                <button type="button" className="danger" onClick={() => void deleteEvent(selected)}>Delete</button>
              </div>
            </>
          ) : (
            <div className="calendar-empty">
              <span className="calendar-kicker">STAFF PLANNER</span>
              <h2>Plan the next event.</h2>
              <p>Click any day to create an event, or select an existing event to manage its setup.</p>
              <button type="button" className="calendar-primary" onClick={() => createEvent(dateKey(cursor.getFullYear(), cursor.getMonth(), 1))}>+ Create Event</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

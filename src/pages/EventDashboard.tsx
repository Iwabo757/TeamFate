import { Link } from "react-router-dom";

export default function EventDashboard() {
  return (
    <div className="page">
      <h1>Event Dashboard</h1>

      <div className="admin-grid">
        <Link
          to="/admin/events/create"
          className="admin-card"
        >
          Create Event
        </Link>

        <Link
          to="/admin/current-events"
          className="admin-card"
        >
          Current Events
        </Link>

        <Link
          to="/admin/past-events"
          className="admin-card"
        >
          Past Events
        </Link>
      </div>
    </div>
  );
}
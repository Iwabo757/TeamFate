import { useNavigate } from "react-router-dom";

export default function EventCard({
  event,
}: any) {
  const navigate = useNavigate();

  return (
    <div
      className="event-card"
      onClick={() =>
        navigate(
          `/events/${event.id}`
        )
      }
    >
      <img
        src={
          event.images?.[0] ||
          "/event-placeholder.png"
        }
        alt={event.title}
        className="event-card-image"
      />

      <div className="event-card-content">
        <h3>{event.title}</h3>

        <p>
          {new Date(
            event.start_date
          ).toLocaleDateString()}
        </p>

        <p>
          Prize: {event.prize}
        </p>
      </div>
    </div>
  );
}
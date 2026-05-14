import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyEvents, getEventRegistrations } from "@/lib/api";
import { ErrorMessage, Button } from "@/components/ui";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useNavigate } from "react-router-dom";
import type { Event, Attendee } from "@event-manager/shared";
import { CalendarIcon } from "./icons";
import { formatDate, formatWeekday, formatTime } from "@/lib/date";

function RegistrationsList({ eventId }: { eventId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["registrations", eventId],
    queryFn: () => getEventRegistrations(eventId),
    retry: false,
  });

  const attendees: Attendee[] = data?.data ?? [];

  if (isLoading)
    return (
      <p className="text-xs text-gray-400 py-3">Loading registrations...</p>
    );
  if (error)
    return (
      <p className="text-xs text-red-400 py-3">Failed to load registrations</p>
    );
  if (attendees.length === 0)
    return <p className="text-xs text-gray-300 py-3">No registrations yet</p>;

  return (
    <div className="mt-3 border-t border-gray-50 pt-3 flex flex-col gap-3">
      {attendees.map((a) => (
        <div key={a.userId} className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center shrink-0">
              {a.userName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{a.userName}</p>
              <p className="text-xs text-gray-400">{a.userEmail}</p>
            </div>
          </div>
          <span className="text-xs text-gray-300">
            {new Date(a.registeredAt).toLocaleDateString("en", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

function EventRow({ event }: { event: Event }) {
  const [expanded, setExpanded] = useState(false);
  const isFullyBooked =
    event.maxCapacity != null && event.attendeeCount >= event.maxCapacity;
  const capacityPct = event.maxCapacity
    ? Math.min((event.attendeeCount / event.maxCapacity) * 100, 100)
    : null;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex">
        <div
          className="w-28 shrink-0"
          style={{
            background: event.imageKey
              ? `url(${event.imageKey}) center/cover`
              : "linear-gradient(135deg,#a8c0ff,#3f5efb)",
          }}
        />

        <div className="flex-1 p-4 flex flex-col justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-orange-500 tracking-wide uppercase">
              {event.category}
            </span>
            <h3 className="font-['Righteous'] text-base text-gray-900 leading-tight">
              {event.title}
            </h3>
            <span className="text-xs text-gray-400">
              {formatWeekday(event.dateTimestamp)},{" "}
              {formatDate(event.dateTimestamp)} at{" "}
              {formatTime(event.dateTimestamp)}
            </span>
            <span className="text-xs text-gray-300">{event.location}</span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {capacityPct !== null ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isFullyBooked ? "bg-red-400" : "bg-orange-400"
                    }`}
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {event.attendeeCount} / {event.maxCapacity}
                  {isFullyBooked && (
                    <span className="text-red-400 ml-1">· Full</span>
                  )}
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-gray-500">
                {event.attendeeCount} going
              </span>
            )}

            <button
              onClick={() => setExpanded((p) => !p)}
              className="cursor-pointer text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors self-start"
            >
              {expanded ? "Hide registrations ↑" : "See registrations ↓"}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50">
          <RegistrationsList eventId={event.id} />
        </div>
      )}
    </div>
  );
}

export default function OrganizerDashboard() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-events"],
    queryFn: getMyEvents,
    retry: false,
  });

  const events: Event[] = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-['Righteous'] text-3xl text-gray-900">
            My events
          </h1>
          <p className="text-sm text-gray-400 mt-1">Events you have created</p>
        </div>
      </div>

      <LoadingIndicator isLoading={isLoading} />
      <ErrorMessage error={error} />

      {!isLoading && !error && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <CalendarIcon />
          </div>
          <p className="text-gray-400 text-sm font-medium">No events yet</p>
          <p className="text-gray-300 text-xs">Create your first event</p>
          <Button
            variant="red"
            className="mt-2"
            onClick={() => navigate("/create")}
          >
            + Create event
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

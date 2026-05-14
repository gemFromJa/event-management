import { useState } from "react";
import { Button, ErrorMessage } from "./ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyRegistrations, registerForEvent } from "../lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import type { Event } from "@event-manager/shared";
import { CalendarIcon, CheckIcon, PeopleIcon, PinIcon } from "./icons";

type Tab = "details" | "success";

interface Props {
  event: Event | null;
  onClose: () => void;
}

function Detail({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      {icon}
      {children}
    </div>
  );
}

export default function EventModal({ event, onClose }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("details");

  const isAttendee = user?.role === "attendee";
  const isOrganizer = user?.role === "organizer";
  const isOwnEvent = isOrganizer && event?.organizerId === user?.id;

  const { data: registrationsData } = useQuery({
    queryKey: ["my-registrations"],
    queryFn: getMyRegistrations,
    enabled: !!user && isAttendee,
    retry: false,
    select: (data: { data: Event[] }) =>
      new Set<string>(data.data?.map((r) => r.id) ?? []),
  });

  const attendedEventIds = registrationsData ?? new Set<string>();
  const isAttending = attendedEventIds.has(event?.id ?? "");

  const {
    mutate,
    isPending,
    error: mutationError,
  } = useMutation({
    mutationFn: () => registerForEvent(event!.id),
    onSuccess: () => {
      setTab("success");
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  if (!event) return null;

  const isFullyBooked =
    event.maxCapacity != null && event.attendeeCount >= event.maxCapacity;

  function handleClose() {
    setTab("details");
    onClose();
  }

  function handleJoin() {
    if (!user) {
      navigate("/login");
      onClose();
      return;
    }
    mutate();
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl overflow-hidden max-w-lg mx-auto shadow-xl">
        <div
          className="h-40 w-full relative"
          style={{
            background: event.imageKey
              ? `url(${event.imageKey}) center/cover`
              : "linear-gradient(135deg,#ff9a8b,#ff6a88)",
          }}
        >
          {/* `yours` badge */}
          {isOwnEvent && (
            <span className="absolute top-3 left-3 text-xs font-semibold bg-white/90 text-orange-500 px-2.5 py-1 rounded-full">
              Your event
            </span>
          )}
          <button
            onClick={handleClose}
            className="absolute cursor-pointer top-3 right-3 bg-black/20 hover:bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {tab === "details" && (
            <div>
              <span className="text-xs font-semibold text-orange-500 tracking-wide uppercase">
                {event.category}
              </span>
              <h2 className="font-['Righteous'] text-2xl text-gray-900 mt-1 mb-4 leading-tight">
                {event.title}
              </h2>

              <div className="flex flex-col gap-2 mb-4">
                <Detail icon={<CalendarIcon />}>
                  {new Date(event.date + "T00:00:00").toLocaleDateString("en", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at {event.time}
                </Detail>
                <Detail icon={<PinIcon />}>{event.location}</Detail>
                {event.maxCapacity && (
                  <Detail icon={<PeopleIcon />}>
                    {event.attendeeCount} / {event.maxCapacity} going
                  </Detail>
                )}
              </div>

              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                {event.description}
              </p>

              {mutationError && <ErrorMessage error={mutationError} />}

              {/* attendee joining preview */}
              {isAttendee && user && !isFullyBooked && !isAttending && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl mb-4">
                  <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
              )}

              {/* organizer — view only */}
              {isOrganizer && (
                <p className="text-sm text-center text-gray-400">
                  {isOwnEvent
                    ? "You created this event"
                    : "Organizers cannot register for events"}
                </p>
              )}

              {/* attendee only actions */}
              {isAttendee &&
                (isAttending ? (
                  <span className="font-semibold text-sm text-center block text-gray-400">
                    You're going
                  </span>
                ) : (
                  <Button
                    variant="red"
                    className="w-full"
                    disabled={isFullyBooked || isPending}
                    onClick={handleJoin}
                  >
                    {isFullyBooked
                      ? "Fully booked"
                      : isPending
                      ? "Registering..."
                      : event.attendeeCount > 0
                      ? `Join ${event.attendeeCount} going`
                      : "Join event"}
                  </Button>
                ))}

              {/* not logged in */}
              {!user && (
                <Button variant="red" className="w-full" onClick={handleJoin}>
                  Login to join
                </Button>
              )}
            </div>
          )}

          {tab === "success" && (
            <div className="flex flex-col items-center text-center py-4 gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <CheckIcon />
              </div>
              <h3 className="font-['Righteous'] text-2xl text-gray-900">
                You're in!
              </h3>
              <p className="text-sm text-gray-400">
                Confirmation sent to <strong>{user?.email}</strong>.<br />
                See you at {event.title}.
              </p>
              <Button
                variant="red"
                className="mt-4 w-full"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

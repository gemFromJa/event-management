import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyRegistrations, cancelRegistration } from "@/lib/api";
import { Button, ErrorMessage } from "@/components/ui";
import LoadingIndicator from "@/components/LoadingIndicator";
import EventCard from "@/components/EventCard";
import { useNavigate } from "react-router-dom";
import type { Event } from "@event-manager/shared";
import { TicketIcon } from "./icons";

export default function AttendeeDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-registrations"],
    queryFn: getMyRegistrations,
    retry: false,
  });

  const {
    mutate: cancel,
    isPending: cancelling,
    variables,
  } = useMutation({
    mutationFn: (eventId: string) => cancelRegistration(eventId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] }),
  });

  const events: Event[] = data?.data ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-['Righteous'] text-3xl text-gray-900">
          My registrations
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Events you have signed up for
        </p>
      </div>

      <LoadingIndicator isLoading={isLoading} />
      <ErrorMessage error={error} />

      {!isLoading && !error && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <TicketIcon />
          </div>
          <p className="text-gray-400 text-sm font-medium">
            No registrations yet
          </p>
          <p className="text-gray-300 text-xs">Browse events and join one</p>
          <Button
            variant="border"
            className="mt-2"
            onClick={() => navigate("/")}
          >
            Browse events
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            attended
            onClick={() => {}}
            onCancel={() => cancel(event.id)}
            cancelling={cancelling && variables === event.id}
          />
        ))}
      </div>
    </div>
  );
}

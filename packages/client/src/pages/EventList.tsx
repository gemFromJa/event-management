import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getEvents, getMyRegistrations } from "../lib/api";
import EventCard from "../components/EventCard";
import SearchAndFilter, {
  type SearchFilterState,
} from "../components/SearchAndFilter";
import { toLocalDate, formatDate, formatWeekday } from "@/lib/date";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { CATEGORIES } from "@event-manager/shared";
import EventModal from "../components/EventRegistrationModal";
import LoadingIndicator from "../components/LoadingIndicator";
import type { Event } from "@event-manager/shared";
import { useAuth } from "@/context/AuthContext";

const FILTERS = ["All", ...CATEGORIES];

export default function EventList() {
  const { user } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchFilter, setSearchFilter] = useState<SearchFilterState>({
    query: "",
    dateFilter: { mode: "single", date: "" },
    activeFilter: "All",
    activeMore: [],
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["events", searchFilter],
    queryFn: ({ pageParam }) =>
      getEvents({
        cursor: pageParam,
        query: searchFilter.query,
        ...(searchFilter.dateFilter.mode === "single"
          ? { date: searchFilter.dateFilter.date }
          : {
              dateFrom: searchFilter.dateFilter.dateFrom,
              dateTo: searchFilter.dateFilter.dateTo,
            }),
        category:
          searchFilter.activeFilter === "All"
            ? undefined
            : searchFilter.activeFilter,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    retry: false,
  });

  const { data: registrationsData } = useQuery({
    queryKey: ["my-registrations"],
    queryFn: getMyRegistrations,
    enabled: !!user && user.role === "attendee",
    retry: false,
    select: (data: { data: Event[] }) =>
      new Set<string>(data.data?.map((r) => r.id) ?? []),
  });

  const attendedEventIds = registrationsData ?? new Set<string>();
  const events =
    data?.pages
      .flatMap((p) => p.items)
      .sort((a, b) => a.dateTimestamp - b.dateTimestamp) ?? [];

  const groupedEvents = events.reduce<Record<string, Event[]>>((acc, event) => {
    const localDate = toLocalDate(event.dateTimestamp);
    if (!acc[localDate]) acc[localDate] = [];
    acc[localDate].push(event);
    return acc;
  }, {});

  return (
    <div className="max-w-content mx-auto lg:py-8">
      <EventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <SearchAndFilter
        filters={FILTERS}
        value={searchFilter}
        onChange={setSearchFilter}
      />

      <div className="px-7 pb-20">
        <LoadingIndicator isLoading={isLoading} />
        <ErrorMessage error={error} />

        {!isLoading && !isError && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-gray-400 text-sm font-medium">No events found</p>
            <p className="text-gray-300 text-xs">
              Try a different search or filter
            </p>
          </div>
        )}

        {Object.entries(groupedEvents).map(([localDate, dayEvents]) => (
          <div key={localDate}>
            <div className="flex items-baseline gap-2 pt-8 pb-3">
              <span className="font-['Righteous'] text-sm text-gray-900">
                {formatDate(dayEvents[0].dateTimestamp)}
              </span>
              <span className="text-sm text-gray-300">
                {formatWeekday(dayEvents[0].dateTimestamp)}
              </span>
            </div>
            {dayEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                attended={attendedEventIds.has(event.id)}
                onClick={() => setSelectedEvent(event)}
              />
            ))}
          </div>
        ))}

        {hasNextPage && (
          <div className="flex justify-center py-10">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-sm font-semibold text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-40"
            >
              {isFetchingNextPage ? "Loading..." : "Load more events"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

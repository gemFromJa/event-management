import type { Event } from "@event-manager/shared";
import cn from "../utils/cn";
import { CheckIcon, PinIcon } from "./icons";
import { formatTime } from "@/lib/date";
import { Button } from "./ui";

interface Props {
  event: Event;
  attended: boolean;
  onClick: () => void;
  onCancel?: () => void; // ← optional
  cancelling?: boolean; // ← optional
}

export default function EventCard({
  event,
  attended,
  onClick,
  onCancel,
  cancelling,
}: Props) {
  return (
    <div
      onClick={onClick}
      className="flex border border-gray-100 rounded-xl mb-2 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      <div
        className="w-28 shrink-0"
        style={{
          background: event.imageKey
            ? `url(${event.imageKey}) center/cover`
            : "linear-gradient(135deg,#ff9a8b,#ff6a88)",
        }}
      />

      <div className="flex-1 p-3.5 flex flex-col justify-between min-h-25">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-orange-500 tracking-wide">
            {formatTime(event.dateTimestamp)}
          </span>
          <h3 className="font-['Righteous'] text-base text-gray-900 leading-tight">
            {event.title}
          </h3>
          <span className="text-xs font-semibold text-orange-400">
            {event.category}
          </span>
          <span className="text-xs text-gray-300 flex items-center gap-1">
            <PinIcon />
            {event.location}
          </span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span
            className={cn(
              "text-sm font-bold flex items-center gap-1",
              attended ? "text-orange-500" : "text-gray-900 hidden md:flex"
            )}
          >
            {attended && <CheckIcon />}
            {event.attendeeCount} going
          </span>

          {onCancel && (
            <Button
              variant="border"
              className="text-xs text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel registration"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export const toLocalDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString("en-CA");

export const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString("en", {
    month: "long",
    day: "numeric",
  });

export const formatWeekday = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString("en", { weekday: "long" });

export const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  dateTimestamp: number;
  attendeeCount: number;
  maxCapacity?: number;
  imageKey?: string;
  organizerId: string;
  createdAt: string;
}

export interface Attendee {
  userId: string;
  userName: string;
  userEmail: string;
  registeredAt: string;
  eventId: string;
}

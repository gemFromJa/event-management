import z from "zod";
import { CATEGORIES } from "./constants";

const dateString = z.string().refine((date) => !isNaN(Date.parse(date)), {
  message: "Invalid date format",
});

export const SearchEventsSchema = z.object({
  cursor: z.string().optional(),
  title: z.string().optional(),
  category: z.enum(["All", ...CATEGORIES]).optional(),
  date: dateString.optional(),
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
});

export const CreateEventSchema = z.object({
  title: z.string().min(1, "Event name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(CATEGORIES, { error: "Must be a valid category" }),
  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
      "Date must be UTC ISO format e.g. 2026-06-14T19:00:00Z"
    ),
  location: z.string().min(1, "Location is required"),
  maxCapacity: z.number().int().positive("Capacity must be a positive number"),
  tags: z.array(z.string()).default([]),
});

export const SignupSchema = z.object({
  role: z.enum(["attendee", "organizer"]),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export const LoginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SearchEventsInput = z.infer<typeof SearchEventsSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

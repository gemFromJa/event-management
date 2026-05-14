import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent } from "../lib/api";
import { CATEGORIES, CreateEventSchema } from "@event-manager/shared";
import { Button, Field, Input } from "@/components/ui";

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  date?: string;
  time?: string;
  location?: string;
  maxCapacity?: string;
}

const DEFAULT_FORM = {
  title: "",
  description: "",
  category: "",
  date: "",
  time: "",
  location: "",
  maxCapacity: 100,
};

export default function CreateEvent() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(DEFAULT_FORM);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit() {
    // validate date and time first since they need combining
    const dateTimeErrors: FormErrors = {};
    if (!form.date) dateTimeErrors.date = "Date is required";
    if (!form.time) dateTimeErrors.time = "Time is required";
    if (Object.keys(dateTimeErrors).length > 0) {
      setErrors(dateTimeErrors);
      return;
    }

    const result = CreateEventSchema.safeParse({
      ...form,
      date: new Date(`${form.date}T${form.time}:00`).toISOString(),
    });

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await createEvent(result.data);
      navigate("/");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-content mx-auto px-7 py-9 pb-24">
      <h1 className="font-['Righteous'] text-3xl text-gray-900 mb-1">
        New event
      </h1>
      <p className="text-sm text-gray-400 mb-9">
        Fill in the details and get people hyped.
      </p>

      {/* cover image — placeholder until S3 upload is wired */}
      <div className="border-2 border-dashed border-gray-200 rounded-2xl h-44 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all mb-8">
        <span className="text-sm font-semibold text-gray-400">
          Add event cover image
        </span>
        <span className="text-xs text-gray-300">JPG, PNG · max 10MB</span>
      </div>

      <section className="mb-7">
        <h2 className="font-['Righteous'] text-xs tracking-widest text-gray-300 uppercase mb-4">
          Details
        </h2>

        <Field label="Event name" error={errors.title}>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Demon Slayer Infinity Castle Premiere"
            error={errors.title}
          />
        </Field>

        <Field label="Description" error={errors.description}>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Get people hyped. What's happening, what to expect..."
            rows={4}
            className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors resize-none ${
              errors.description
                ? "border-red-300 focus:border-red-400 bg-red-50"
                : "border-gray-200 focus:border-orange-400 bg-white"
            }`}
          />
        </Field>

        <Field label="Category" error={errors.category}>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors cursor-pointer ${
              errors.category
                ? "border-red-300 focus:border-red-400 bg-red-50"
                : "border-gray-200 focus:border-orange-400 bg-white"
            }`}
          >
            <option value="" disabled>
              Select a category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field label="Capacity" error={errors.maxCapacity}>
          <Input
            type="number"
            value={form.maxCapacity}
            onChange={(e) => set("maxCapacity", e.target.value)}
            placeholder="100"
            error={errors.maxCapacity}
          />
        </Field>
      </section>

      <section className="mb-7">
        <h2 className="font-['Righteous'] text-xs tracking-widest text-gray-300 uppercase mb-4">
          When
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" error={errors.date}>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              error={errors.date}
            />
          </Field>
          <Field label="Time" error={errors.time}>
            <Input
              type="time"
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
              error={errors.time}
            />
          </Field>
        </div>
      </section>

      <section className="mb-7">
        <h2 className="font-['Righteous'] text-xs tracking-widest text-gray-300 uppercase mb-4">
          Where
        </h2>
        <Field label="Venue / location" error={errors.location}>
          <Input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. Carib 5 Cinemas, Kingston"
            error={errors.location}
          />
        </Field>
      </section>

      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-500">
          {submitError}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="border" onClick={() => navigate("/")}>
          Cancel
        </Button>
        <Button variant="red" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Publishing..." : "Publish event →"}
        </Button>
      </div>
    </div>
  );
}

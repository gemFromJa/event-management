import { ErrorMessage } from "./ErrorMessage";

// ── helpers ───────────────────────────────────────────────────────────────────
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      <ErrorMessage error={error || ""} />
    </div>
  );
}

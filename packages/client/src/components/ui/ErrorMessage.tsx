export function ErrorMessage({ error }: { error: Error | string | null }) {
  if (!error) return null;

  const message =
    (typeof error === "string" ? error : error.message) ||
    "Something went wrong. Try again.";
  return (
    <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-500">
      {message}
    </div>
  );
}

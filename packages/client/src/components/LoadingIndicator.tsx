export default function LoadingIndicator({
  isLoading,
}: {
  isLoading: boolean;
}) {
  if (!isLoading) return null;

  return (
    <div className="flex flex-col gap-3 pt-6">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex border border-gray-100 rounded-xl overflow-hidden h-24 animate-pulse"
        >
          <div className="w-28 bg-gray-100 shrink-0" />
          <div className="flex-1 p-4 flex flex-col gap-2 justify-center">
            <div className="h-3 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

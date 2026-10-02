export default function MapStatus({ loading, error }) {
  if (!loading && !error) return null;

  const className = error
    ? "absolute bottom-[180px] left-4 z-[100] rounded-md bg-red-100 px-3 py-1.5 text-xs text-red-700 shadow"
    : "absolute bottom-[180px] left-4 z-[100] rounded-md bg-white/95 px-3 py-1.5 text-xs shadow";

  return (
    <div className={className}>
      {error ? `Lỗi: ${error}` : "Đang tải mèo..."}
    </div>
  );
}

export default function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f7ff]">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        Loading admin data...
      </div>
    </div>
  );
}

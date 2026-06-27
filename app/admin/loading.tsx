export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-[#f0f2f5] px-4">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#5a8dee]" />
        Loading admin data...
      </div>
    </div>
  );
}

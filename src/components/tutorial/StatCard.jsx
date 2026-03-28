export default function StatCard({ label, value, className = "" }) {
  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <div className="text-slate-500">{label}</div>
      <div className="font-mono mt-1">{value}</div>
    </div>
  );
}

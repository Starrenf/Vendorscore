export default function Notice({ title="Let op", children, tone="info" }) {
  const cls =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <div className={`card border ${cls} p-4`}>
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-slate-700 leading-relaxed">{children}</div>
    </div>
  );
}

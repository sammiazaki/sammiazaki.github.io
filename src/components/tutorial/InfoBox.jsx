const variants = {
  muted: "bg-slate-100 text-slate-700",
  dark: "bg-slate-900 text-white",
  warning: "bg-amber-50 text-slate-700",
  success: "bg-emerald-50 text-slate-700",
  outline: "border text-slate-700",
  formula: "bg-slate-100 font-mono text-sm text-slate-700",
};

export default function InfoBox({
  title,
  variant = "muted",
  className = "",
  children,
}) {
  return (
    <div className={`rounded-2xl p-4 ${variants[variant]} ${className}`}>
      {title && <div className="font-semibold">{title}</div>}
      <div className={title ? "mt-2 text-sm" : "text-sm"}>{children}</div>
    </div>
  );
}

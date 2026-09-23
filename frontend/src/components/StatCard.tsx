export function StatCard({
  label,
  value,
  tone = 'default',
  hint,
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'error' | 'warn' | 'ok';
  hint?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: 'text-slate-100',
    error: 'text-red-400',
    warn: 'text-amber-400',
    ok: 'text-emerald-400',
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

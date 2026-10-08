import type { ReactNode } from "react";

export function FormField({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-ink" htmlFor={id}>{label}</label>
      {children}
      {hint ? <p className="text-xs leading-5 text-ink/60" id={`${id}-hint`}>{hint}</p> : null}
    </div>
  );
}

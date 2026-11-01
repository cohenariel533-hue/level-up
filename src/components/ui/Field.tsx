import type { ReactNode } from 'react';

/** A labelled form field. Put an <input className="input">, <select> or anything inside. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

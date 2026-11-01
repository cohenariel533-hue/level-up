import { Plus } from 'lucide-react';

/** The round floating "+" button, sitting just above the tab bar. */
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="fab" aria-label={label} onClick={onClick}>
      <Plus aria-hidden="true" />
    </button>
  );
}

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Read by screen readers, since the switch has no visible text. */
  label: string;
}

/** iOS-style on/off switch. */
export function Toggle({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="toggle"
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

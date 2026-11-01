interface Props {
  value: string;
  onChange: (value: string) => void;
  label: string;
  autoFocus?: boolean;
  /** Briefly shakes the field, e.g. when saving with no amount. */
  invalid?: boolean;
}

/**
 * The big "₪ 0" amount field. Kept as text (not a number input) so "45,50"
 * works and the iPhone shows its decimal keypad. Parse with lib/money parseAmount.
 */
export function AmountInput({ value, onChange, label, autoFocus, invalid }: Props) {
  return (
    <label className={`amount-field ${invalid ? 'is-invalid' : ''}`}>
      <span className="amount-currency" aria-hidden="true">
        ₪
      </span>
      <input
        aria-label={label}
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        placeholder="0"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

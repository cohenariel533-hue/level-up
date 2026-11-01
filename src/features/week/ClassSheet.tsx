import { useEffect, useState } from 'react';
import { Button, Field, Sheet } from '../../components/ui';
import type { ClassSlot } from '../../db/schema';
import { addClass, deleteClass, updateClass } from '../../db/week';
import { t } from '../../i18n/en';
import { toMinutes } from '../../lib/time';

/** Add or edit a real class time (a locked school block). */
export function ClassSheet({
  open,
  onClose,
  slot,
  defaultDay,
}: {
  open: boolean;
  onClose: () => void;
  slot?: ClassSlot;
  defaultDay: number;
}) {
  const [name, setName] = useState('');
  const [day, setDay] = useState(defaultDay);
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:30');

  useEffect(() => {
    if (!open) return;
    setName(slot?.name ?? '');
    setDay(slot?.day ?? defaultDay);
    setStart(slot?.start ?? '10:00');
    setEnd(slot?.end ?? '11:30');
  }, [open, slot, defaultDay]);

  const canSave = name.trim().length > 0 && toMinutes(end) > toMinutes(start);

  async function save() {
    if (!canSave) return;
    const data = { name: name.trim(), day, start, end };
    if (slot?.id) await updateClass(slot.id, data);
    else await addClass(data);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={slot ? t.week.editClass : t.week.addClass}>
      <div className="stack">
        <Field label={t.week.className}>
          <input
            className="input"
            value={name}
            placeholder={t.week.classNamePlaceholder}
            autoFocus={!slot}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={t.week.day}>
          <select className="input" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {t.week.days.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-row">
          <Field label={t.week.start}>
            <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={t.week.end}>
            <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Button variant="primary" size="lg" block onClick={save} disabled={!canSave}>
          {t.week.save}
        </Button>
        {slot && (
          <Button
            variant="subtle"
            block
            onClick={async () => {
              await deleteClass(slot.id!);
              onClose();
            }}
          >
            {t.week.deleteClass}
          </Button>
        )}
      </div>
    </Sheet>
  );
}

import { useEffect, useState } from 'react';
import { Button, Field, Sheet, Toggle, useToast } from '../../components/ui';
import { addOrder, deleteOrder, updateOrder } from '../../db/hustle';
import type { Occasion, Order, OrderStatus, PackageId } from '../../db/schema';
import { t } from '../../i18n/en';
import { ORDER_STATUSES, suggestedPrice } from '../../lib/hustle';
import { parseAmount } from '../../lib/money';
import s from './hustle.module.css';

const OCCASIONS: Occasion[] = ['anniversary', 'birthday', 'proposal', 'business', 'other'];
const PACKAGES: PackageId[] = ['basic', 'premium', 'business'];

/** Add or edit an order. Picking a package (and rush) fills in the price. */
export function OrderSheet({ open, onClose, order }: { open: boolean; onClose: () => void; order?: Order }) {
  const toast = useToast();
  const [client, setClient] = useState('');
  const [occasion, setOccasion] = useState<Occasion>('anniversary');
  const [pkg, setPkg] = useState<PackageId>('basic');
  const [rush, setRush] = useState(false);
  const [price, setPrice] = useState('149');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<OrderStatus>('lead');
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClient(order?.client ?? '');
    setOccasion(order?.occasion ?? 'anniversary');
    setPkg(order?.package ?? 'basic');
    setRush(order?.rush ?? false);
    setPrice(String(order?.price ?? 149));
    setDeadline(order?.deadline ?? '');
    setStatus(order?.status ?? 'lead');
    setPaid(order?.paid ?? false);
    setNotes(order?.notes ?? '');
    setConfirmDelete(false);
  }, [open, order]);

  // Changing package or rush updates the price (business stays as typed).
  function choosePackage(next: PackageId, nextRush: boolean) {
    setPkg(next);
    setRush(nextRush);
    const suggested = suggestedPrice(next, nextRush);
    if (suggested !== null) setPrice(String(suggested));
    if (next === 'business') setOccasion('business');
  }

  const priceValue = parseAmount(price);
  const canSave = client.trim().length > 0 && priceValue !== null;

  async function save() {
    if (!canSave) return;
    // Being in "Paid" or later implies payment; a lead can't be marked paid without moving it.
    const isPaid = status === 'lead' ? paid : true;
    const data = {
      client: client.trim(),
      occasion,
      package: pkg,
      rush,
      price: priceValue!,
      deadline: deadline || null,
      notes: notes.trim(),
      status: isPaid && status === 'lead' ? ('paid' as const) : status,
      paid: isPaid,
    };
    if (order?.id) await updateOrder(order.id, data);
    else await addOrder(data);
    onClose();
  }

  async function remove() {
    if (!order?.id) return;
    if (!confirmDelete) return setConfirmDelete(true);
    await deleteOrder(order.id);
    toast(t.hustle.orderDeleted);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={order ? t.hustle.editOrder : t.hustle.newOrder}>
      <div className="stack">
        <Field label={t.hustle.client}>
          <input
            className="input"
            value={client}
            placeholder={t.hustle.clientPlaceholder}
            autoFocus={!order}
            onChange={(e) => setClient(e.target.value)}
          />
        </Field>

        <Field label={t.hustle.occasion}>
          <div className={s.chips}>
            {OCCASIONS.map((o) => (
              <button key={o} type="button" className={s.chip} aria-pressed={occasion === o} onClick={() => setOccasion(o)}>
                {t.hustle.occasions[o]}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t.hustle.package}>
          <div className={s.chips}>
            {PACKAGES.map((p) => (
              <button key={p} type="button" className={s.chip} aria-pressed={pkg === p} onClick={() => choosePackage(p, rush)}>
                {t.hustle.packages[p]}
              </button>
            ))}
          </div>
        </Field>

        <div className="list-row" style={{ cursor: 'default', padding: '2px' }}>
          <span className="list-text list-label">{t.hustle.rush}</span>
          <Toggle checked={rush} onChange={(v) => choosePackage(pkg, v)} label={t.hustle.rush} />
        </div>

        <div className="form-row">
          <Field label={t.hustle.price}>
            <input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label={t.hustle.deadline}>
            <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>

        <div className="form-row">
          <Field label={t.hustle.status}>
            <select
              className="input"
              value={status}
              onChange={(e) => {
                const next = e.target.value as OrderStatus;
                setStatus(next);
                if (next !== 'lead') setPaid(true);
              }}
            >
              {ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {t.hustle.statuses[st]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.hustle.paid}>
            <div style={{ minHeight: 46, display: 'flex', alignItems: 'center' }}>
              <Toggle
                checked={paid}
                label={t.hustle.paid}
                onChange={(v) => {
                  setPaid(v);
                  if (v && status === 'lead') setStatus('paid');
                  if (!v && status !== 'lead') setStatus('lead');
                }}
              />
            </div>
          </Field>
        </div>

        <Field label={t.hustle.notes}>
          <textarea
            className="input"
            rows={3}
            value={notes}
            placeholder={t.hustle.notesPlaceholder}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <Button variant="primary" size="lg" block onClick={save} disabled={!canSave}>
          {t.hustle.save}
        </Button>
        {order && (
          <Button variant="subtle" block onClick={remove}>
            {confirmDelete ? t.hustle.deleteConfirm : t.hustle.deleteOrder}
          </Button>
        )}
      </div>
    </Sheet>
  );
}

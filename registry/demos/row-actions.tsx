'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Row Actions" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { RiArrowGoBackLine } from '@remixicon/react';
import { RowActions } from '@/registry/ui/row-actions';
import { Button } from '@/registry/ui/button';
import { Input } from '@/registry/ui/input';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/registry/ui/modal';

type Payment = { id: string; payee: string; initials: string; method: string; date: string; amount: number };

const INITIAL: readonly Payment[] = [
  { id: 'p1', payee: 'John Clarkson', initials: 'JC', method: 'Visa ending 4242', date: 'Sep 05, 2026', amount: 3412 },
  { id: 'p2', payee: 'Aspen Lubin', initials: 'AL', method: 'Bank transfer', date: 'Mar 25, 2026', amount: 1899 },
  { id: 'p3', payee: 'Mia Chen', initials: 'MC', method: 'Mastercard ending 1881', date: 'Jun 12, 2026', amount: 640 },
  { id: 'p4', payee: 'Leo Park', initials: 'LP', method: 'PayPal', date: 'Apr 02, 2026', amount: 1250 },
  { id: 'p5', payee: 'Ana Carter', initials: 'AC', method: 'Visa ending 0057', date: 'Jul 19, 2026', amount: 2349 },
];

const money = (n: number) => `$${n.toLocaleString('en-US')}`;
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

export default function Demo() {
  const [rows, setRows] = useState<Payment[]>(() => [...INITIAL]);
  const [lastAction, setLastAction] = useState('Use the row buttons or the menu to edit, duplicate or delete a payment.');
  const [editId, setEditId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const copies = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);
  const focusAfterDelete = useRef<string | null | undefined>(undefined);

  // A deleted row takes its focused buttons with it; move focus to the
  // neighbouring row's kebab, or to Reset once the table is empty.
  useEffect(() => {
    const target = focusAfterDelete.current;
    if (target === undefined) return;
    focusAfterDelete.current = undefined;
    const next = target
      ? listRef.current?.querySelector<HTMLElement>(`[data-row-id="${target}"] [data-row-actions-trigger]`)
      : resetRef.current;
    next?.focus();
  }, [rows]);

  const remove = (row: Payment) => {
    const index = rows.findIndex((r) => r.id === row.id);
    focusAfterDelete.current = (rows[index + 1] ?? rows[index - 1])?.id ?? null;
    setRows((current) => current.filter((r) => r.id !== row.id));
    setLastAction(`Deleted ${row.payee}.`);
  };

  const duplicate = (row: Payment) => {
    copies.current += 1;
    const copy: Payment = { ...row, id: `${row.id}-copy${copies.current}`, payee: `${row.payee} (copy)` };
    setRows((current) => {
      const index = current.findIndex((r) => r.id === row.id);
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
    setLastAction(`Duplicated ${row.payee}.`);
  };

  const startEdit = (row: Payment) => {
    setEditId(row.id);
    setDraft(row.payee);
    setEditOpen(true);
  };

  const save = (event: FormEvent, close: () => void) => {
    event.preventDefault();
    const name = draft.trim();
    const row = rows.find((r) => r.id === editId);
    if (row && name && name !== row.payee) {
      setRows((current) => current.map((r) => (r.id === row.id ? { ...r, payee: name, initials: initialsOf(name) } : r)));
      setLastAction(`Renamed ${row.payee} to ${name}.`);
    }
    close();
  };

  const reset = () => {
    copies.current = 0;
    setRows([...INITIAL]);
    setLastAction('Payments restored.');
  };

  return (
    <div className="w-full max-w-[1000px]" data-demo>
      <div className="overflow-hidden rounded-3xl border border-border-table bg-background-full">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex flex-col">
            <p className="text-body-medium text-text-tertiary">Recent payments</p>
            <p data-row-count className="text-body-medium text-text-primary tabular-nums">
              {rows.length} {rows.length === 1 ? 'payment' : 'payments'}
            </p>
          </div>
          <Button ref={resetRef} variant="secondary" size="small" leadingIcon={RiArrowGoBackLine} onClick={reset}>
            Reset
          </Button>
        </div>

        <div className="border-t border-border-table">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_1.3fr_1fr_0.8fr_120px] gap-4 bg-background-secondary-default px-5 py-2.5 text-caption-1-medium text-text-tertiary md:grid">
            <span>Payee</span>
            <span>Method</span>
            <span>Date</span>
            <span className="text-end">Amount</span>
            <span className="sr-only">Actions</span>
          </div>
          <ul ref={listRef} aria-label="Payments" className="max-h-[290px] overflow-y-auto">
            {rows.map((row) => (
              <li
                key={row.id}
                data-row-id={row.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1 border-b border-border-table px-4 py-2.5 last:border-b-0 sm:px-5 md:grid-cols-[minmax(0,1.5fr)_1.3fr_1fr_0.8fr_120px] md:gap-x-4"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-background-tertiary-default text-caption-1-medium text-text-secondary"
                  >
                    {row.initials}
                  </span>
                  <span data-payee className="truncate text-body-medium text-text-primary">
                    {row.payee}
                  </span>
                </span>
                <span className="hidden truncate text-body-regular text-text-secondary md:block">{row.method}</span>
                <span className="hidden text-body-regular text-text-secondary md:block">{row.date}</span>
                <span className="text-end">
                  <span className="rounded-md bg-background-secondary-default px-1.5 py-0.5 text-body-medium text-text-primary tabular-nums">
                    {money(row.amount)}
                  </span>
                </span>
                <span className="flex justify-end">
                  <RowActions
                    name={row.payee}
                    inline
                    onEdit={() => startEdit(row)}
                    onDuplicate={() => duplicate(row)}
                    onDelete={() => remove(row)}
                    confirmDescription={`The ${money(row.amount)} payment from ${row.date} will be removed from this table. You can’t undo this.`}
                  />
                </span>
                <span className="col-span-3 text-caption-1-regular text-text-tertiary md:hidden">
                  {row.method} · {row.date}
                </span>
              </li>
            ))}
          </ul>
          {rows.length === 0 ? (
            <p data-empty className="px-5 py-10 text-center text-body-regular text-text-tertiary">
              No payments left. Press Reset to bring them back.
            </p>
          ) : null}
        </div>
        <p data-last-action aria-live="polite" className="border-t border-border-table px-4 py-3 text-caption-1-regular text-text-tertiary sm:px-5">
          {lastAction}
        </p>
      </div>

      <Modal isOpen={editOpen} onOpenChange={setEditOpen} size="sm">
        {({ close }) => (
          <form onSubmit={(event) => save(event, close)} className="contents">
            <ModalHeader title="Edit payment" description="Change the payee shown in this row." />
            <ModalBody>
              <Input label="Payee" value={draft} onChange={setDraft} autoFocus isRequired />
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { RiDeleteBinLine, RiUserAddLine } from '@remixicon/react';

import { Avatar } from '@/registry/ui/avatar';
import { Button } from '@/registry/ui/button';
import { AlertDialog, Modal, ModalBody, ModalFooter, ModalHeader, ModalTrigger } from '@/registry/ui/modal';

/* Two triggers, the two shapes of the component: a regular dialog with a
   header, a scrolling body and a footer, and an AlertDialog whose confirm
   returns a promise, so the dialog stays open, busy, until it settles.
   Nothing opens on its own; press a button. */

const PEOPLE = [
  { initials: 'JL', name: 'Jordan Lee', email: 'jordan@acme.co', color: 'lime' },
  { initials: 'SR', name: 'Steven Raule', email: 'steven@acme.co', color: 'pink' },
  { initials: 'LP', name: 'Lauren Proso', email: 'lauren@acme.co', color: 'blue' },
] as const;

export default function Demo() {
  const [status, setStatus] = useState('No changes yet.');

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <ModalTrigger>
          <Button variant="secondary" leadingIcon={RiUserAddLine}>
            Invite teammates
          </Button>
          <Modal>
            {({ close }) => (
              <>
                <ModalHeader
                  icon={RiUserAddLine}
                  title="Invite teammates"
                  description="They get an email with a link to join Acme Dashboard."
                />
                <ModalBody>
                  <ul className="flex flex-col gap-3">
                    {PEOPLE.map((person) => (
                      <li key={person.email} className="flex items-center gap-3">
                        <Avatar size="md" color={person.color} initials={person.initials} aria-hidden />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-body-medium text-text-primary">{person.name}</span>
                          <span className="truncate text-body-2-regular text-text-tertiary">{person.email}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ModalBody>
                <ModalFooter>
                  <Button variant="secondary" onClick={close}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setStatus('Invites sent to 3 people.');
                      close();
                    }}
                  >
                    Send invites
                  </Button>
                </ModalFooter>
              </>
            )}
          </Modal>
        </ModalTrigger>

        <ModalTrigger>
          <Button variant="danger" leadingIcon={RiDeleteBinLine}>
            Delete project
          </Button>
          <AlertDialog
            title="Delete project?"
            description="Acme Dashboard and its 24 files will be deleted for everyone. You can't undo this."
            confirmLabel="Delete project"
            pendingLabel="Deleting…"
            onCancel={() => setStatus('Kept the project.')}
            onConfirm={() =>
              new Promise<void>((resolve) => {
                window.setTimeout(() => {
                  setStatus('Project deleted.');
                  resolve();
                }, 1200);
              })
            }
          />
        </ModalTrigger>
      </div>

      <p aria-live="polite" className="text-body-2-regular text-text-tertiary">
        {status}
      </p>
    </div>
  );
}

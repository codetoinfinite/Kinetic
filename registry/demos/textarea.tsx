'use client';

import { useState } from 'react';

import { Textarea } from '@/registry/ui/textarea';

const MIN_REASON = 20;

/* Left: a release-notes composer that grows from 2 to 5 lines, with a
   280-character counter. Right: a fixed-height field with a resize handle
   that validates a minimum length once you leave it. */
export default function Demo() {
  const [notes, setNotes] = useState('Ship the release notes before Friday.');
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);

  const reasonInvalid = reasonTouched && reason.trim().length < MIN_REASON;

  return (
    <div className="grid w-full max-w-[680px] grid-cols-1 items-start gap-x-6 gap-y-6 sm:grid-cols-2">
      <Textarea
        label="Release notes"
        placeholder="What changed in this version?"
        value={notes}
        onChange={setNotes}
        autoResize
        rows={2}
        maxRows={5}
        maxLength={280}
        showCount
        hint="Grows as you type, up to five lines."
      />
      <Textarea
        label="Why are you cancelling?"
        placeholder="Tell us what didn't work for your team"
        isRequired
        rows={4}
        value={reason}
        onChange={(value) => {
          setReason(value);
          if (reasonTouched && value.trim().length >= MIN_REASON) setReasonTouched(false);
        }}
        onBlur={() => setReasonTouched(true)}
        isInvalid={reasonInvalid}
        showCount
        hint={`At least ${MIN_REASON} characters.`}
      />
    </div>
  );
}

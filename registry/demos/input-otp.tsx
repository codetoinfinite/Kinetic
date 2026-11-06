'use client';

import { useState } from 'react';
import { RiCheckboxCircleFill } from '@remixicon/react';

import { InputOtp } from '@/registry/ui/input-otp';

const CODE = '731428';

/* An email verification step. The code is checked once all six boxes are
   filled: the right one shows a success line, any other turns the boxes red. */
export default function Demo() {
  const [value, setValue] = useState('');

  const complete = value.length === CODE.length;
  const verified = complete && value === CODE;
  const invalid = complete && !verified;

  return (
    <div className="flex w-full max-w-[420px] flex-col items-center gap-5 rounded-2lg border border-border-button-default bg-background-primary-default px-5 py-6 text-center shadow-xs">
      <div className="flex flex-col gap-1">
        <p className="text-title-3-medium text-text-primary">Check your email</p>
        <p className="text-body-regular text-text-secondary">
          Enter the 6-digit code we sent to ada@company.com. For this demo it is {CODE}.
        </p>
      </div>

      <InputOtp
        value={value}
        onChange={setValue}
        groupEvery={3}
        isInvalid={invalid}
        aria-label="Verification code"
        className="max-[400px]:gap-1.5 max-[400px]:[&_input]:size-10"
      />

      <div className="flex min-h-5 items-center justify-center gap-1 text-caption-1-medium" aria-live="polite">
        {verified ? (
          <span className="flex items-center gap-1 text-notification-success-foreground">
            <RiCheckboxCircleFill className="size-4" aria-hidden />
            Code verified
          </span>
        ) : invalid ? (
          <span className="text-text-error-primary">That code does not match. Check the email and try again.</span>
        ) : (
          <span className="text-text-tertiary">Paste the whole code into the first box to fill them all.</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setValue('')}
        className="text-body-2-medium text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
      >
        Clear code
      </button>
    </div>
  );
}

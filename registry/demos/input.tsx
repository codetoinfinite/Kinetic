'use client';

import { useState } from 'react';
import { RiLinkM, RiMailLine, RiSearchLine, RiUser3Line } from '@remixicon/react';

import { Input } from '@/registry/ui/input';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* An account form: a required name, an email that validates on blur (it
   starts invalid so the error state is visible), a locked workspace URL and
   a small unlabelled search field named by its placeholder. */
export default function Demo() {
  const [name, setName] = useState('Ada Lovelace');
  const [email, setEmail] = useState('ada@analytical');
  const [emailTouched, setEmailTouched] = useState(true);
  const [query, setQuery] = useState('');

  const emailInvalid = emailTouched && email.length > 0 && !EMAIL.test(email);

  return (
    <div className="grid w-full max-w-[640px] grid-cols-1 gap-x-6 gap-y-5 rounded-2lg border border-border-button-default bg-background-primary-default p-5 shadow-xs sm:grid-cols-2">
      <Input
        label="Full name"
        placeholder="Your name"
        leadingIcon={RiUser3Line}
        isRequired
        value={name}
        onChange={setName}
      />
      <Input
        label="Work email"
        type="email"
        placeholder="you@company.com"
        leadingIcon={RiMailLine}
        isRequired
        value={email}
        onChange={(value) => {
          setEmail(value);
          setEmailTouched(false);
        }}
        onBlur={() => setEmailTouched(true)}
        isInvalid={emailInvalid}
        hint="We send the sign-in link here."
        errorMessage="Enter an email like name@company.com."
      />
      <Input
        label="Workspace URL"
        tooltip
        leadingIcon={RiLinkM}
        value="kinetic.so/acme"
        isDisabled
        hint="Only an owner can change this."
      />
      <div className="flex flex-col gap-1 sm:justify-end">
        <Input
          size="small"
          placeholder="Search members"
          leadingIcon={RiSearchLine}
          value={query}
          onChange={setQuery}
        />
      </div>
    </div>
  );
}

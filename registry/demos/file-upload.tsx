'use client';

import { useRef, useState } from 'react';
import { RiFileExcel2Line, RiFilePdf2Line, RiFileZipLine } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { FileUpload, formatFileSize } from '@/registry/ui/file-upload';

type Upload = { id: number; name: string; size: number };

const INITIAL: Upload[] = [
  { id: 1, name: 'q1-invoices.xlsx', size: 412_000 },
  { id: 2, name: 'brand-guidelines.pdf', size: 2_516_582 },
];

/* BoardUI's own preview drops a generated file into the zone. Here the sample
   goes in through `incomingFile`, so a reader sees the full upload without a
   file of their own (and without `new DataTransfer()`, which some browsers lack). */
export default function Demo() {
  const nextId = useRef(3);
  const [uploads, setUploads] = useState<Upload[]>(INITIAL);
  const [pending, setPending] = useState(false);
  const [sample, setSample] = useState<File | null>(null);

  return (
    <div className="flex w-full max-w-[533px] flex-col gap-4">
      <FileUpload
        incomingFile={sample}
        onUploadComplete={(file) => {
          const id = nextId.current++;
          setUploads((list) => [{ id, name: file.name, size: file.size }, ...list].slice(0, 4));
          setPending(false);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-2-regular text-text-tertiary">No file handy?</span>
        <Button
          variant="secondary"
          size="small"
          leadingIcon={RiFilePdf2Line}
          disabled={pending}
          onClick={() => {
            setPending(true);
            setSample(new File([new Uint8Array(1_800_000)], 'launch-deck.pdf', { type: 'application/pdf' }));
          }}
        >
          Drop a sample PDF
        </Button>
        <Button
          variant="ghost"
          size="small"
          leadingIcon={RiFileZipLine}
          disabled={pending}
          onClick={() => setSample(new File([new Uint8Array(2048)], 'assets.zip', { type: 'application/zip' }))}
        >
          Try a .zip
        </Button>
      </div>

      <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-1">
        <div className="px-3 pt-2 pb-1 text-caption-1-medium text-text-tertiary">Recent uploads</div>
        <ul className="flex flex-col">
          {uploads.map((upload) => {
            const Icon = upload.name.endsWith('.xlsx') ? RiFileExcel2Line : RiFilePdf2Line;
            return (
              <li key={upload.id} className="flex items-center gap-3 rounded-xl px-3 py-2">
                <Icon className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-body-medium text-text-primary">{upload.name}</span>
                <span className="text-body-2-regular text-text-secondary">{formatFileSize(upload.size)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { RiArchiveLine, RiDownload2Line, RiLoader4Line, RiSave3Line, RiUploadCloud2Line } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { Toaster, toast, type ToastId } from '@/registry/ui/toast';

function LoadingIcon({ className, ...props }: { className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }) {
  return <RiLoader4Line className={`${className ?? ''} motion-safe:animate-spin`} {...props} />;
}

/* Each button calls `toast` from an event handler; the one <Toaster /> draws
   them in the bottom-end corner, at most three at a time. "Export" shows a
   loading toast that `toast.update` turns into a success, "Archive" carries
   an Undo action that closes it and fires a follow-up toast. Hover or focus
   the stack to hold every countdown. */
export default function Demo() {
  const exports = useRef(new Map<ToastId, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = exports.current;
    return () => {
      // Leaving the page cancels the pretend export, so no spinner is left behind.
      for (const [id, timer] of pending) {
        clearTimeout(timer);
        toast.dismiss(id);
      }
      pending.clear();
    };
  }, []);

  const startExport = () => {
    const id = toast('Exporting report…', {
      description: 'Q3 summary, 12 pages.',
      icon: LoadingIcon,
      duration: Infinity,
      dismissible: false,
    });
    const timer = setTimeout(() => {
      exports.current.delete(id);
      toast.update(id, {
        title: 'Report exported',
        description: 'q3-summary.pdf is ready.',
        status: 'success',
        icon: undefined,
        duration: 4000,
        dismissible: true,
      });
    }, 1800);
    exports.current.set(id, timer);
  };

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-headline-medium text-text-primary">Fire a toast</h3>
        <p className="text-body-regular text-text-secondary">Hover the stack to hold its countdowns.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="small" variant="secondary" leadingIcon={RiSave3Line} onClick={() => toast.success('Changes saved')}>
          Save
        </Button>
        <Button
          size="small"
          variant="secondary"
          leadingIcon={RiArchiveLine}
          onClick={() =>
            toast.info('Project archived', {
              description: 'Acme Dashboard moved to the archive.',
              actions: [
                {
                  label: 'Undo',
                  onClick: () => toast('Project restored', { description: 'Acme Dashboard is back in Projects.' }),
                },
              ],
            })
          }
        >
          Archive
        </Button>
        <Button
          size="small"
          variant="secondary"
          leadingIcon={RiUploadCloud2Line}
          onClick={() => toast.error('Upload failed', { description: 'The file is over 20MB.' })}
        >
          Upload
        </Button>
        <Button size="small" variant="secondary" leadingIcon={RiDownload2Line} onClick={startExport}>
          Export
        </Button>
      </div>

      <Button size="small" variant="ghost" className="self-start" onClick={() => toast.dismiss()}>
        Dismiss all
      </Button>

      <Toaster />
    </div>
  );
}

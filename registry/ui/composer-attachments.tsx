/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Composer Attachments" (boardui.com/components/composer-attachments).
 * No BoardUI source was used.
 */
"use client";

import {
  RiCloseLine,
  RiFileCodeFill,
  RiFileFill,
  RiFileMusicFill,
  RiFilePdf2Fill,
  RiFileTextFill,
  RiFileVideoFill,
  RiFileZipFill,
  RiImageFill,
  RiSlideshow2Fill,
  RiTableFill,
  type RemixiconComponentType,
} from "@remixicon/react";
import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cx } from "@/registry/lib/cx";

export type AttachmentKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "code"
  | "archive"
  | "file";

export interface ComposerAttachment {
  id: string;
  name: string;
  /** Bytes. */
  size: number;
  /** Derived from the name when omitted. */
  kind?: AttachmentKind;
  /** 0-100 while uploading. Omit (or 100) once the file has landed. */
  progress?: number;
}

const KIND_STYLE: Record<AttachmentKind, { icon: RemixiconComponentType; tone: string; label: string }> = {
  image: { icon: RiImageFill, tone: "text-status-cyan-text", label: "Image" },
  video: { icon: RiFileVideoFill, tone: "text-status-purple-text", label: "Video" },
  audio: { icon: RiFileMusicFill, tone: "text-status-yellow-text", label: "Audio" },
  pdf: { icon: RiFilePdf2Fill, tone: "text-status-rose-text", label: "PDF" },
  document: { icon: RiFileTextFill, tone: "text-status-blue-text", label: "Document" },
  spreadsheet: { icon: RiTableFill, tone: "text-status-lime-text", label: "Spreadsheet" },
  presentation: { icon: RiSlideshow2Fill, tone: "text-status-orange-text", label: "Presentation" },
  code: { icon: RiFileCodeFill, tone: "text-foreground-icon-secondary", label: "Code" },
  archive: { icon: RiFileZipFill, tone: "text-foreground-icon-tertiary", label: "Archive" },
  file: { icon: RiFileFill, tone: "text-foreground-icon-tertiary", label: "File" },
};

const EXTENSIONS: Record<string, AttachmentKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", avif: "image", heic: "image",
  mp4: "video", mov: "video", webm: "video", mkv: "video",
  mp3: "audio", wav: "audio", m4a: "audio", ogg: "audio", flac: "audio",
  pdf: "pdf",
  doc: "document", docx: "document", txt: "document", md: "document", rtf: "document", pages: "document",
  xls: "spreadsheet", xlsx: "spreadsheet", csv: "spreadsheet", tsv: "spreadsheet", numbers: "spreadsheet",
  ppt: "presentation", pptx: "presentation", key: "presentation",
  js: "code", jsx: "code", ts: "code", tsx: "code", json: "code", py: "code", go: "code", rs: "code",
  html: "code", css: "code", sh: "code", yml: "code", yaml: "code", sql: "code",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
};

/** Kind from the extension, then from the MIME family, else "file". */
export function kindOf(name: string, mime = ""): AttachmentKind {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  const byExt = EXTENSIONS[ext];
  if (byExt) return byExt;
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

const UNITS = ["KB", "MB", "GB"] as const;

/** 812 B, 4.2 KB, 18 MB: one decimal below 10, whole numbers above. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${UNITS[unit]}`;
}

/** Reads names and sizes from picked files. Nothing is read from the contents or uploaded. */
export function attachmentsFromFiles(files: File[], idPrefix: string, progress?: number): ComposerAttachment[] {
  return files.map((file, i) => ({
    id: `${idPrefix}-${i}-${file.name}`,
    name: file.name,
    size: file.size,
    kind: kindOf(file.name, file.type),
    progress,
  }));
}

// #region critical
/*
 * The ring traces the tile's own rounded edge, starting at top centre and
 * running clockwise. Tile is 56px with a 12px radius; the stroke is centred
 * 1px in, so the path is a 54px rect with an 11px radius. pathLength=100 turns
 * progress straight into a dash offset.
 */
const RING_PATH =
  "M28 1H44A11 11 0 0 1 55 12V44A11 11 0 0 1 44 55H12A11 11 0 0 1 1 44V12A11 11 0 0 1 12 1Z";

function UploadRing({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 56 56" aria-hidden className="pointer-events-none absolute -inset-px size-14 overflow-visible">
      <path
        d={RING_PATH}
        pathLength={100}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="100 100"
        strokeDashoffset={100 - progress}
        className="text-accent-500 transition-[stroke-dashoffset] duration-200 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}

export interface ComposerAttachmentTileProps {
  attachment: ComposerAttachment;
  /** Removes a landed file, or cancels one still uploading. */
  onRemove?: (id: string) => void;
  className?: string;
}

export function ComposerAttachmentTile({ attachment, onRemove, className }: ComposerAttachmentTileProps) {
  const { id, name, size, progress } = attachment;
  const kind = attachment.kind ?? kindOf(name);
  const { icon: Icon, tone, label } = KIND_STYLE[kind];
  const pct = progress === undefined ? 100 : Math.max(0, Math.min(100, Math.round(progress)));
  const uploading = pct < 100;
  // The corner holds the percentage while uploading and the dismiss once landed.
  // Hover or keyboard focus swaps them early, so an upload can be cancelled.
  const fade = "transition-[opacity,filter] duration-200 ease-out motion-reduce:transition-none";

  return (
    <div
      title={`${name}, ${formatBytes(size)}`}
      data-uploading={uploading || undefined}
      className={cx(
        "group relative flex size-14 shrink-0 flex-col justify-between rounded-xl border border-composer-panel-tile-border bg-background-primary-default p-1.5",
        className,
      )}
    >
      <Icon className={cx("size-[18px] shrink-0", tone)} aria-hidden />
      <span className="sr-only">{label}:</span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[9px]/[11px] font-medium text-text-primary">{name}</span>
        <span className="truncate text-[9px]/[11px] text-text-tertiary tabular-nums">
          {formatBytes(size)}
          {uploading && <span className="sr-only">, uploading {pct}%</span>}
        </span>
      </span>

      {uploading && <UploadRing progress={pct} />}

      <span
        aria-hidden
        className={cx(
          "pointer-events-none absolute end-1 top-1 text-[9px]/[11px] font-semibold text-accent-500 tabular-nums",
          fade,
          uploading
            ? "opacity-100 blur-none group-focus-within:opacity-0 group-hover:opacity-0"
            : "opacity-0 blur-[2px]",
        )}
      >
        {pct}%
      </span>

      {onRemove && (
        <button
          type="button"
          aria-label={uploading ? `Cancel ${name}` : `Remove ${name}`}
          onClick={() => onRemove(id)}
          className={cx(
            "absolute end-1 top-1 grid size-[18px] place-items-center rounded-full bg-background-tertiary-default text-foreground-icon-secondary outline-none hover:bg-background-tertiary-hover hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            fade,
            uploading
              ? "opacity-0 blur-[2px] group-focus-within:opacity-100 group-focus-within:blur-none group-hover:opacity-100 group-hover:blur-none"
              : "opacity-100 blur-none",
          )}
        >
          <RiCloseLine className="size-3" aria-hidden />
        </button>
      )}
    </div>
  );
}
// #endregion

export interface ComposerAttachmentsProps {
  attachments: ComposerAttachment[];
  onRemove?: (id: string) => void;
  className?: string;
}

/** The strip of tiles that sits above a composer's prompt. Renders nothing when empty. */
export function ComposerAttachments({ attachments, onRemove, className }: ComposerAttachmentsProps) {
  if (attachments.length === 0) return null;
  return (
    <ul aria-label="Attachments" className={cx("flex gap-2 overflow-x-auto p-0.5 [scrollbar-width:thin]", className)}>
      {attachments.map((a) => (
        <li key={a.id} className="motion-safe:animate-[cell-pop_240ms_ease-out_both]">
          <ComposerAttachmentTile attachment={a} onRemove={onRemove} />
        </li>
      ))}
    </ul>
  );
}

export interface ComposerAttachButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type" | "children"> {
  /** Receives the picked files. The input is cleared after, so the same file can be picked again. */
  onFiles: (files: File[]) => void;
  /** Passed to the file input, e.g. "image/*,.pdf". */
  accept?: string;
  multiple?: boolean;
  children: ReactNode;
}

/** A button that opens the browser's file picker through a hidden `<input type="file">`. */
export function ComposerAttachButton({
  onFiles,
  accept,
  multiple = true,
  children,
  ...rest
}: ComposerAttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" {...rest} onClick={() => inputRef.current?.click()}>
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        hidden
        tabIndex={-1}
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          const picked = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = "";
          if (picked.length > 0) onFiles(picked);
        }}
      />
    </>
  );
}

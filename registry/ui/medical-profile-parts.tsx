/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Medical Profile" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useId, useRef, useState, type ComponentType } from "react";
import {
  RiAddLine,
  RiArrowLeftLine,
  RiAsterisk,
  RiDropLine,
  RiFileAddLine,
  RiFilter3Line,
  RiMenLine,
  RiStethoscopeLine,
} from "@remixicon/react";

import { Avatar } from "@/registry/ui/avatar";
import { Button } from "@/registry/ui/button";
import { Checkbox } from "@/registry/ui/checkbox";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTrigger } from "@/registry/ui/modal";
import { Popover, PopoverFooter, PopoverHeader, PopoverTrigger } from "@/registry/ui/popover";
import { Select, SelectItem } from "@/registry/ui/select";
import { Textarea } from "@/registry/ui/textarea";
import { cx } from "@/registry/lib/cx";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

/* ------------------------------------------------------------ patient card */

export interface ProfileDetail {
  icon: IconComponent;
  label: string;
  value: string;
}

export const PROFILE_DETAILS: ProfileDetail[] = [
  { icon: RiAsterisk, label: "Date of Birth", value: "28 July, 1997" },
  { icon: RiMenLine, label: "Gender", value: "Male" },
  { icon: RiDropLine, label: "Blood Type", value: "A rh+" },
  { icon: RiStethoscopeLine, label: "GP Doctor", value: "Mattheus Clarkson" },
];

export interface PatientProfileCardProps {
  name?: string;
  initials?: string;
  details?: ProfileDetail[];
  className?: string;
}

/**
 * Avatar, name and four detail rows. The "+" opens the file picker; the chosen
 * image is shown through an object URL that is revoked when it is replaced or
 * the card unmounts.
 */
export function PatientProfileCard({
  name = "Jordan Lee",
  initials = "J",
  details = PROFILE_DETAILS,
  className,
}: PatientProfileCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo);
  }, [photo]);

  return (
    <section
      aria-label={`${name}, patient details`}
      className={cx(
        "flex w-full min-w-0 flex-col items-center gap-4 rounded-2xl bg-background-secondary-default px-2.5 pt-6 pb-2.5",
        className,
      )}
    >
      <div className="relative">
        <Avatar
          size="lg"
          initials={initials}
          src={photo ?? undefined}
          alt={photo ? `${name}'s photo` : undefined}
          className="size-[66px] text-[26px] leading-none"
        />
        <Button
          variant="secondary"
          size="xs"
          iconOnly
          leadingIcon={RiAddLine}
          aria-label={photo ? "Change profile photo" : "Add profile photo"}
          onClick={() => inputRef.current?.click()}
          className="absolute -end-1 -top-1 rounded-full"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) setPhoto(URL.createObjectURL(file));
            event.currentTarget.value = "";
          }}
        />
      </div>
      <p className="text-title-2-medium whitespace-nowrap text-text-primary">{name}</p>
      <dl className="flex w-full flex-1 flex-col justify-end gap-2.5">
        {details.map((detail) => (
          <div
            key={detail.label}
            className="flex w-full items-center justify-between gap-3 rounded-2lg bg-background-inner-default px-2.5 py-2"
          >
            <dt className="flex min-w-0 items-center gap-1.5 text-body-regular text-text-secondary">
              <detail.icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{detail.label}</span>
            </dt>
            <dd className="text-body-medium whitespace-nowrap text-text-primary">{detail.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------------------------------------------------------- section filter */

export interface DashboardSection {
  id: string;
  label: string;
}

export interface SectionFilterProps {
  sections: DashboardSection[];
  /** Ids currently shown. */
  visible: ReadonlySet<string>;
  onVisibleChange: (next: Set<string>) => void;
}

/** "Filters": a popover of checkboxes that show or hide the dashboard's cards. */
export function SectionFilter({ sections, visible, onVisibleChange }: SectionFilterProps) {
  const hidden = sections.length - sections.filter((s) => visible.has(s.id)).length;
  const toggle = (id: string, on: boolean) => {
    const next = new Set(visible);
    if (on) next.add(id);
    else next.delete(id);
    onVisibleChange(next);
  };

  return (
    <PopoverTrigger>
      <Button variant="secondary" leadingIcon={RiFilter3Line} aria-label={hidden ? `Filters, ${hidden} hidden` : "Filters"}>
        Filters
        {hidden > 0 ? (
          <span className="ms-1 rounded-md bg-background-tertiary-default px-1.5 text-caption-1-medium text-text-secondary tabular-nums">
            {hidden}
          </span>
        ) : null}
      </Button>
      <Popover placement="bottom end" className="w-[264px]" dialogClassName="flex flex-col gap-3 p-3">
        <PopoverHeader title="Show on dashboard" description="Hidden cards come back from here." />
        <div className="flex flex-col gap-2">
          {sections.map((section) => (
            <Checkbox
              key={section.id}
              isSelected={visible.has(section.id)}
              onChange={(on) => toggle(section.id, on)}
            >
              {section.label}
            </Checkbox>
          ))}
        </div>
        <PopoverFooter>
          <Button
            variant="ghost"
            size="small"
            disabled={hidden === 0}
            onClick={() => onVisibleChange(new Set(sections.map((s) => s.id)))}
          >
            Show all
          </Button>
        </PopoverFooter>
      </Popover>
    </PopoverTrigger>
  );
}

/* ------------------------------------------------------------ file report */

export type ReportKind = "symptom" | "medication" | "lab" | "appointment";

export const REPORT_KINDS: { id: ReportKind; label: string }[] = [
  { id: "symptom", label: "New symptom" },
  { id: "medication", label: "Medication issue" },
  { id: "lab", label: "Lab result question" },
  { id: "appointment", label: "Appointment change" },
];

export interface FiledReport {
  kind: ReportKind;
  details: string;
}

/** Primary "File a report" button and its form dialog. */
export function FileReportDialog({ onSubmit }: { onSubmit: (report: FiledReport) => void }) {
  const formId = useId();
  const [isOpen, setOpen] = useState(false);
  const [kind, setKind] = useState<ReportKind>("symptom");
  const [details, setDetails] = useState("");
  const ready = details.trim().length > 0;

  const close = () => {
    setOpen(false);
    setDetails("");
    setKind("symptom");
  };

  return (
    <ModalTrigger isOpen={isOpen} onOpenChange={(open) => (open ? setOpen(true) : close())}>
      <Button leadingIcon={RiAddLine}>File a report</Button>
      <Modal size="sm">
        <ModalHeader
          icon={RiFileAddLine}
          title="File a report"
          description="Your GP, Mattheus Clarkson, sees it in their inbox right away."
        />
        <ModalBody>
          <form
            id={formId}
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!ready) return;
              onSubmit({ kind, details: details.trim() });
              close();
            }}
          >
            <Select
              label="Report type"
              selectedKey={kind}
              onSelectionChange={(key) => {
                if (key !== null) setKind(key as ReportKind);
              }}
              className="w-full"
              triggerClassName="w-full"
            >
              {REPORT_KINDS.map((option) => (
                <SelectItem key={option.id} id={option.id} textValue={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
            <Textarea
              label="Details"
              placeholder="What happened, and when?"
              rows={4}
              maxLength={280}
              showCount
              value={details}
              onChange={setDetails}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!ready}>
            Submit report
          </Button>
        </ModalFooter>
      </Modal>
    </ModalTrigger>
  );
}

/* ------------------------------------------------------------- other views */

export interface WorkspacePlaceholderProps {
  icon: IconComponent;
  label: string;
  /** Name of the page the button goes back to. */
  homeLabel: string;
  onBack: () => void;
}

/** What the other sidebar rows open: a quiet panel that points back to this template's page. */
export function WorkspacePlaceholder({ icon: Icon, label, homeLabel, onBack }: WorkspacePlaceholderProps) {
  return (
    <section
      aria-label={label}
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default p-10 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-background-primary-default text-foreground-icon-secondary shadow-xs">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-title-3-medium text-text-primary">{label}</h2>
        <p className="text-body-regular text-text-secondary">
          {label} is a template of its own. This page is the {homeLabel} screen, so there is nothing to show here yet.
        </p>
      </div>
      <Button variant="secondary" leadingIcon={RiArrowLeftLine} onClick={onBack}>
        Back to {homeLabel}
      </Button>
    </section>
  );
}

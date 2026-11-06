'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "FAQ Section" (boardui.com/).
 * No BoardUI source was used.
 */
import { useState } from "react";
import type { Key } from "react-aria-components";
import { RiContractUpDownLine, RiExpandUpDownLine, RiQuestionAnswerLine } from "@remixicon/react";
import { Button } from "@/registry/ui/button";
import { FaqSection } from "@/registry/ui/faq-section";
import type { FaqEntry } from "@/registry/ui/faq-section";

/* The landing page's question list at full page width: the heading block holds
   the left column and the questions run down the right. Answers can stay open
   together here so the toolbar can expand or collapse all of them. */
const FAQ: FaqEntry[] = [
  {
    id: "payment",
    question: "Is Pro a one-time payment?",
    answer:
      "Yes. You pay once and keep everything you downloaded. There is no subscription and nothing renews unless you choose a plan with updates.",
  },
  {
    id: "starter-vs-pro",
    question: "What is the difference between Starter and Pro?",
    answer:
      "Starter covers the core components and two dashboard templates. Pro adds every chart, the agent blocks, all ten templates and the Figma file.",
  },
  {
    id: "install",
    question: "How do I install a component?",
    answer:
      "Copy the install command from its page and run it in your project. The files land in your components folder with their dependencies listed.",
  },
  {
    id: "ownership",
    question: "Do I own the code?",
    answer:
      "You do. Components are copied into your repository, so you can edit, rename and restyle them like any other file you wrote.",
  },
  {
    id: "commercial",
    question: "Can I use it in client and commercial projects?",
    answer:
      "Yes, in as many client and commercial projects as you like. You cannot resell the kit itself as a competing component library.",
  },
  {
    id: "updates",
    question: "What is the difference between 1 Year of Updates and Lifetime Access?",
    answer:
      "Both include everything shipped today. One year gets new releases for twelve months; lifetime gets every future release with no end date.",
  },
  {
    id: "refunds",
    question: "Do you offer refunds?",
    answer:
      "If the kit is not right for you, write to us within 14 days of purchase and we will refund the full amount.",
  },
  {
    id: "stack",
    question: "What is the kit built on?",
    answer: "React 19, Tailwind CSS v4 and React Aria for accessible behaviour, with TanStack Table under the data grids.",
  },
  {
    id: "dark-mode",
    question: "Does it support dark mode?",
    answer: "Every component reads semantic colour tokens, so switching the theme class on the root swaps the whole palette.",
  },
];

export default function Demo() {
  const [expanded, setExpanded] = useState<Set<Key>>(() => new Set<Key>(["install"]));
  const allOpen = expanded.size === FAQ.length;

  return (
    <div className="h-full w-full overflow-y-auto bg-background-full">
      <div className="px-10 pt-20 pb-16">
        <FaqSection
          items={FAQ}
          title={
            <>
              Frequently
              <br />
              asked questions
            </>
          }
          description="Everything about licensing, installing and building with the kit. Anything else, ask us on Discord."
          allowsMultipleExpanded
          expandedKeys={expanded}
          onExpandedChange={setExpanded}
          aside={
            <div className="flex flex-col items-center gap-3 @5xl:items-start">
              <Button
                variant="secondary"
                size="small"
                leadingIcon={allOpen ? RiContractUpDownLine : RiExpandUpDownLine}
                onClick={() => setExpanded(allOpen ? new Set<Key>() : new Set<Key>(FAQ.map((item) => item.id)))}
              >
                {allOpen ? "Collapse all" : "Expand all"}
              </Button>
              <p className="flex items-center gap-1.5 text-body-regular text-text-tertiary" aria-live="polite">
                <RiQuestionAnswerLine className="size-4 shrink-0" aria-hidden />
                {expanded.size} of {FAQ.length} answers open
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}

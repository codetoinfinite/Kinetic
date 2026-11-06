'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Changes Diff Panel" (boardui.com/).
 * No BoardUI source was used.
 */
import { useState } from 'react';
import { RiGitCommitLine } from '@remixicon/react';

import {
  ChangesDiffPanel,
  type ChangeDecisions,
  type ChangedFile,
} from '@/registry/ui/changes-diff-panel';
import { Button } from '@/registry/ui/button';

const FILES: ChangedFile[] = [
  {
    path: 'app/components/theme-toggle.tsx',
    status: 'added',
    patch: `@@ -0,0 +1,14 @@
+"use client";
+
+import { useTheme } from "@/lib/theme";
+
+export function ThemeToggle() {
+  const { theme, setTheme } = useTheme();
+  const next = theme === "dark" ? "light" : "dark";
+  return (
+    <button type="button" onClick={() => setTheme(next)}>
+      <span className="sr-only">Switch to {next} mode</span>
+      <ThemeIcon theme={theme} />
+    </button>
+  );
+}`,
  },
  {
    path: 'app/styles/tokens.css',
    patch: `@@ -4,9 +4,10 @@
 :root {
   --surface: var(--white);
-  --surface-raised: var(--neutral-50);
+  --surface-raised: var(--neutral-75);
   --text: var(--neutral-900);
-  --text-muted: var(--neutral-500);
+  --text-muted: var(--neutral-600);
+  --focus-ring: var(--blue-500);
 }

 .dark {
@@ -18,7 +19,9 @@
   --surface: var(--neutral-950);
-  --surface-raised: var(--neutral-900);
+  --surface-raised: var(--neutral-875);
   --text: var(--neutral-50);
+  --text-muted: var(--neutral-400);
+  --focus-ring: var(--blue-400);
 }`,
  },
  {
    path: 'app/layout.tsx',
    patch: `@@ -1,8 +1,10 @@
 import type { Metadata } from "next";
+import { ThemeScript } from "@/lib/theme";
 import "./styles/tokens.css";

 export default function RootLayout({ children }: { children: React.ReactNode }) {
   return (
-    <html lang="en">
+    <html lang="en" suppressHydrationWarning>
+      <head><ThemeScript /></head>
       <body>{children}</body>
     </html>`,
  },
  {
    path: 'lib/theme.ts',
    patch: `@@ -12,6 +12,9 @@ export function useTheme() {
   const [theme, setThemeState] = useState<Theme>("light");
-  const setTheme = (t: Theme) => setThemeState(t);
+  const setTheme = (t: Theme) => {
+    document.documentElement.classList.toggle("dark", t === "dark");
+    localStorage.setItem("theme", t);
+    setThemeState(t);
+  };
   return { theme, setTheme };
 }`,
  },
  {
    path: 'app/components/legacy-switch.tsx',
    status: 'deleted',
    patch: `@@ -1,6 +0,0 @@
-export function LegacySwitch({ on, onToggle }: Props) {
-  return (
-    <input type="checkbox" checked={on} onChange={onToggle} />
-  );
-}
-`,
  },
];

export default function Demo() {
  const [decisions, setDecisions] = useState<ChangeDecisions>({});
  const [committed, setCommitted] = useState<number | null>(null);

  const accepted = Object.values(decisions).filter((d) => d === 'accepted').length;
  const reviewed = Object.keys(decisions).length === FILES.length;

  return (
    <div className="flex h-full w-full items-center justify-center bg-background-full p-4 sm:p-6">
      <div className="flex h-[528px] w-full max-w-[620px] flex-col gap-3">
        <ChangesDiffPanel
          files={FILES}
          decisions={decisions}
          onDecisionsChange={(next) => {
            setDecisions(next);
            setCommitted(null);
          }}
          defaultExpanded={['app/components/theme-toggle.tsx']}
          className="flex-1"
        />
        <div className="flex items-center gap-3 rounded-2xl border border-border-button-default bg-background-primary-default px-4 py-2.5">
          <p role="status" className="min-w-0 flex-1 truncate text-caption-1-regular text-text-secondary">
            {committed !== null
              ? `Committed ${committed} ${committed === 1 ? 'file' : 'files'}.`
              : reviewed
                ? `${accepted} of ${FILES.length} files will be committed.`
                : 'Review every file to commit.'}
          </p>
          {committed !== null ? (
            <Button
              key="reset"
              size="small"
              variant="secondary"
              onClick={() => {
                setDecisions({});
                setCommitted(null);
              }}
            >
              Start over
            </Button>
          ) : (
            <Button
              key="commit"
              size="small"
              variant="primary"
              leadingIcon={RiGitCommitLine}
              disabled={!reviewed || accepted === 0}
              onClick={() => setCommitted(accepted)}
            >
              Commit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

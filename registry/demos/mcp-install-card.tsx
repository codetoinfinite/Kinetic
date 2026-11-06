'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "MCP Install Card" (boardui.com/).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiCodeSSlashLine, RiCursorLine, RiTerminalLine } from '@remixicon/react';
import { McpInstallCard } from '@/registry/ui/mcp-install-card';
import type { McpClient } from '@/registry/ui/mcp-install-card';

const CLIENTS: McpClient[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    icon: RiCursorLine,
    file: '.cursor/mcp.json',
    language: 'json',
    code: `{
  "mcpServers": {
    "kinetic": {
      "command": "npx",
      "args": ["-y", "kinetic-mcp@latest"]
    }
  }
}`,
    note: 'Restart Cursor, then ask the agent for a pricing page.',
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    icon: RiTerminalLine,
    language: 'shell',
    code: 'claude mcp add kinetic -- npx -y kinetic-mcp@latest',
    note: 'Run it once in your project folder; /mcp lists the server.',
  },
  {
    id: 'vscode',
    label: 'VS Code',
    icon: RiCodeSSlashLine,
    file: '.vscode/mcp.json',
    language: 'json',
    code: `{
  "servers": {
    "kinetic": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "kinetic-mcp@latest"]
    }
  }
}`,
    note: 'Open Copilot Chat in agent mode and start the server from the file.',
  },
];

export default function Demo() {
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center gap-3 p-6">
      <McpInstallCard
        clients={CLIENTS}
        description="Point your editor's agent at the component server and it can search, read and install every component."
        guide={{ label: 'Full setup guide and example prompts', href: '#mcp-guide' }}
        onCopy={(id) => setCopied(CLIENTS.find((c) => c.id === id)?.label ?? id)}
      />
      <p data-demo="copied" className="min-h-4 text-caption-1-regular text-text-tertiary">
        {copied ? `Copied the ${copied} snippet` : ''}
      </p>
    </div>
  );
}

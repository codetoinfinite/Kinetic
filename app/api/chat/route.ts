// The runtime behind the agent-chat block and the /templates/chat-starter
// pages. Handlers live in the registry lib so installs ship the same file;
// route config cannot be re-exported (Next reads it from this file's AST).
//
// Needs AI_API_KEY in the server environment (never NEXT_PUBLIC_). Without
// it GET reports `configured: false` and the chat renders setup instructions.
export { GET, POST } from '@/registry/lib/agent-chat-route';

export const maxDuration = 30;

import { redirect } from 'next/navigation';

/* The starter's "Components and Blocks" entry: Kinetic's catalogue is the
   real one, so the sidebar link lands there. */
export default function ChatStarterComponentsPage() {
  redirect('/components');
}

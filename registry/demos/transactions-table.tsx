'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Transactions Table" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */

import { TransactionsTable } from '@/registry/ui/transactions-table';
import type { Transaction } from '@/registry/ui/transactions-table';

const TRANSACTIONS: Transaction[] = [
  { id: 't01', name: 'Whole Foods Market', category: 'groceries', account: 'savings', date: '2026-10-28', amount: -135.42, status: 'completed' },
  { id: 't02', name: 'Spotify', category: 'subscriptions', account: 'savings', date: '2026-10-15', amount: -11.99, status: 'completed' },
  { id: 't03', name: 'Acme Corp payroll', category: 'income', account: 'checking', date: '2026-10-31', amount: 6200, status: 'pending' },
  { id: 't04', name: 'iCloud storage', category: 'subscriptions', account: 'credit', date: '2026-10-03', amount: -2.99, status: 'completed' },
  { id: 't05', name: 'Electric utility', category: 'utilities', account: 'credit', date: '2026-10-06', amount: -91.3, status: 'completed' },
  { id: 't06', name: 'Studio K invoice', category: 'income', account: 'checking', date: '2026-10-14', amount: 1286, status: 'completed' },
  { id: 't07', name: 'Shell', category: 'transport', account: 'credit', date: '2026-10-21', amount: -76.18, status: 'completed' },
  { id: 't08', name: 'Netflix', category: 'subscriptions', account: 'credit', date: '2026-10-14', amount: -17.99, status: 'failed' },
  { id: 't09', name: 'Parkside rent', category: 'housing', account: 'checking', date: '2026-10-01', amount: -2150, status: 'completed' },
  { id: 't10', name: 'Blue Bottle Coffee', category: 'dining', account: 'credit', date: '2026-10-27', amount: -14.5, status: 'completed' },
  { id: 't11', name: 'Vanguard transfer', category: 'investing', account: 'savings', date: '2026-10-02', amount: -1000, status: 'completed' },
  { id: 't12', name: 'Delta Air Lines', category: 'travel', account: 'credit', date: '2026-10-19', amount: -412.6, status: 'pending' },
  { id: 't13', name: 'CVS Pharmacy', category: 'health', account: 'credit', date: '2026-10-09', amount: -38.75, status: 'completed' },
  { id: 't14', name: 'Dividend payout', category: 'income', account: 'savings', date: '2026-10-25', amount: 184.2, status: 'completed' },
  { id: 't15', name: 'Uber', category: 'transport', account: 'credit', date: '2026-10-30', amount: -23.4, status: 'pending' },
  { id: 't16', name: 'Trader Joe’s', category: 'groceries', account: 'checking', date: '2026-10-12', amount: -86.07, status: 'completed' },
  { id: 't17', name: 'Sushi Ran', category: 'dining', account: 'credit', date: '2026-10-18', amount: -96, status: 'completed' },
  { id: 't18', name: 'Water & sewer', category: 'utilities', account: 'checking', date: '2026-10-08', amount: -42.15, status: 'failed' },
];

/* Click a column header to sort (click again to flip), filter by status,
   search by merchant or category, and page through the results. */
export default function Demo() {
  return (
    <div className="flex w-full justify-center">
      <TransactionsTable className="max-w-[1100px]" transactions={TRANSACTIONS} pageSize={5} />
    </div>
  );
}

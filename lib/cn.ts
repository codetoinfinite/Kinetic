import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Registry components import this as `@/lib/cn`; the build rewrites that to
 * `@/lib/utils` on the way out, which is where shadcn consumers already have
 * an identical `cn`. Same function, the name the destination expects.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

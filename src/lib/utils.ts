/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInDays, parseISO, isPast, isWithinInterval, addDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateRemainingDays(endDate: string): number {
  const end = parseISO(endDate);
  const now = new Date();
  if (isPast(end)) return 0;
  return differenceInDays(end, now);
}

export function getLeaseStatus(endDate: string) {
  const remainingDays = calculateRemainingDays(endDate);
  if (remainingDays <= 0) return 'expired';
  if (remainingDays <= 2) return 'urgent';
  if (remainingDays <= 30) return 'expiring';
  return 'active';
}

export function formatPhone(phone: string): string {
  // Simple phone formatter for display
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phone;
}
